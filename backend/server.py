import os
import re
import json
import uuid
import logging
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText

import integrations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
LLM_PROVIDER = os.environ.get("LLM_MODEL_PROVIDER", "gemini")
LLM_MODEL = os.environ.get("LLM_MODEL_NAME", "gemini-3.1-pro-preview")

app = FastAPI(title="AutoDelegate API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("autodelegate")


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
TOOL_LABELS = {"jira": "Jira", "gmail": "Gmail", "calendar": "Google Calendar", "none": "None"}


class TranscriptIn(BaseModel):
    transcript: str
    title: Optional[str] = "Untitled Meeting"


class AnalyzeIn(BaseModel):
    meeting_id: str
    speaker_map: dict = Field(default_factory=dict)


class ExecuteIn(BaseModel):
    meeting_id: str
    action_id: str
    demo_mode: bool = True


class EditActionIn(BaseModel):
    meeting_id: str
    action_id: str
    person: Optional[str] = None
    task: Optional[str] = None
    deadline: Optional[str] = None
    action_type: Optional[str] = None
    status: Optional[str] = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_speakers(transcript: str) -> List[str]:
    """Extract ordered unique speaker labels from a 'Label: text' transcript."""
    labels = []
    for line in transcript.splitlines():
        m = re.match(r"^\s*([A-Za-z0-9 _.\-]{1,30}?)\s*:\s*.+", line)
        if m:
            label = m.group(1).strip()
            if label and label not in labels:
                labels.append(label)
    return labels


def _parse_json(text: str) -> dict:
    """Robustly pull the first JSON object out of an LLM response."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


async def llm_json(system: str, prompt: str) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ad-{uuid.uuid4()}",
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    return _parse_json(text)


# --------------------------------------------------------------------------- #
# Diarization (approximate, LLM-based segmentation of raw STT text)
# --------------------------------------------------------------------------- #
async def diarize(raw_text: str) -> str:
    system = (
        "You are a speaker diarization assistant. You receive raw meeting transcript text "
        "with no speaker labels. Segment it into turns and label each turn as 'Speaker 1', "
        "'Speaker 2', etc. based on shifts in topic, pronouns and conversational cues. "
        "This is an approximation — do NOT invent real names. Return ONLY JSON: "
        '{"turns":[{"speaker":"Speaker 1","text":"..."}]}'
    )
    try:
        data = await llm_json(system, f"Transcript:\n{raw_text}")
        turns = data.get("turns", [])
        lines = [f"{t.get('speaker','Speaker 1')}: {t.get('text','').strip()}" for t in turns if t.get("text")]
        if lines:
            return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Diarization fallback: {e}")
    return f"Speaker 1: {raw_text.strip()}"


# --------------------------------------------------------------------------- #
# AI Agent: meeting analysis + action extraction
# --------------------------------------------------------------------------- #
ANALYSIS_SYSTEM = (
    "You are AutoDelegate, an action-oriented meeting analysis agent. "
    "Read the speaker-labelled transcript and extract structured insight. "
    "Carefully distinguish an OPINION (a view/suggestion, no commitment), a DECISION "
    "(a group agreement/final call), an ACTION (a concrete commitment by someone to do a "
    "task, often with a deadline), and INFORMATION (a fact/status update). "
    "Do NOT turn every sentence into a task — only real commitments become actions. "
    "For each ACTION, choose the best tool: 'jira' for engineering/dev/testing/bug tasks, "
    "'gmail' for sending an email/document/message to a person, 'calendar' for scheduling a "
    "meeting/review/event with a date & time. Use 'none' if unclear.\n"
    "Return ONLY valid JSON with this exact shape:\n"
    "{\n"
    '  "summary": "2-3 sentence executive summary",\n'
    '  "items": [\n'
    "    {\n"
    '      "speaker": "label as in transcript",\n'
    '      "person": "responsible person (name if known else speaker label)",\n'
    '      "statement": "the sentence/quote",\n'
    '      "statement_type": "opinion|decision|action|information",\n'
    '      "task": "concise task description (only for action, else empty)",\n'
    '      "deadline": "deadline in natural language (only if stated, else empty)",\n'
    '      "action_type": "jira|gmail|calendar|none",\n'
    '      "confidence": 0.0\n'
    "    }\n"
    "  ]\n"
    "}"
)


async def analyze_transcript(transcript: str) -> dict:
    data = await llm_json(ANALYSIS_SYSTEM, f"Transcript:\n{transcript}")
    summary = data.get("summary", "")
    items = data.get("items", [])

    decisions, opinions, information, actions = [], [], [], []
    for it in items:
        st = (it.get("statement_type") or "information").lower()
        stmt = it.get("statement", "")
        if st == "decision":
            decisions.append(stmt)
        elif st == "opinion":
            opinions.append(stmt)
        elif st == "information":
            information.append(stmt)
        elif st == "action":
            at = (it.get("action_type") or "none").lower()
            if at not in TOOL_LABELS:
                at = "none"
            actions.append({
                "id": str(uuid.uuid4()),
                "person": it.get("person", ""),
                "speaker": it.get("speaker", ""),
                "statement": stmt,
                "task": it.get("task", "") or stmt,
                "deadline": it.get("deadline", ""),
                "action_type": at,
                "tool": TOOL_LABELS[at],
                "confidence": float(it.get("confidence", 0.8) or 0.8),
                "status": "pending",
                "execution_result": None,
            })
    return {
        "summary": summary,
        "decisions": decisions,
        "opinions": opinions,
        "information": information,
        "items": items,
        "actions": actions,
    }


def apply_speaker_map(text: str, speaker_map: dict) -> str:
    if not speaker_map:
        return text
    out_lines = []
    for line in text.splitlines():
        m = re.match(r"^\s*([A-Za-z0-9 _.\-]{1,30}?)\s*:\s*(.+)", line)
        if m and m.group(1).strip() in speaker_map and speaker_map[m.group(1).strip()]:
            out_lines.append(f"{speaker_map[m.group(1).strip()]}: {m.group(2)}")
        else:
            out_lines.append(line)
    return "\n".join(out_lines)


async def get_meeting_or_404(meeting_id: str) -> dict:
    doc = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return doc


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@api_router.get("/")
async def root():
    return {"message": "AutoDelegate API running"}


@api_router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio (Whisper) then diarize into Speaker labels."""
    allowed = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format .{ext}")

    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25 MB limit")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp_path, "rb") as af:
            resp = await stt.transcribe(file=af, model="whisper-1", response_format="json")
        raw_text = resp.text if hasattr(resp, "text") else str(resp)
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    speaker_transcript = await diarize(raw_text)
    speakers = extract_speakers(speaker_transcript)

    meeting = {
        "id": str(uuid.uuid4()),
        "title": file.filename or "Audio Meeting",
        "source": "audio",
        "raw_transcript": raw_text,
        "transcript": speaker_transcript,
        "speakers": speakers,
        "speaker_map": {},
        "diarization_note": "Speakers were auto-segmented and are approximate. Please map them to real names.",
        "status": "transcribed",
        "created_at": now_iso(),
    }
    await db.meetings.insert_one({**meeting})
    meeting.pop("_id", None)
    return meeting


@api_router.post("/meetings")
async def create_meeting(payload: TranscriptIn):
    """Create a meeting from a pasted transcript."""
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")
    speakers = extract_speakers(payload.transcript)
    if not speakers:
        speakers = ["Speaker 1"]
    meeting = {
        "id": str(uuid.uuid4()),
        "title": payload.title or "Untitled Meeting",
        "source": "transcript",
        "raw_transcript": payload.transcript,
        "transcript": payload.transcript,
        "speakers": speakers,
        "speaker_map": {},
        "diarization_note": "",
        "status": "transcribed",
        "created_at": now_iso(),
    }
    await db.meetings.insert_one({**meeting})
    meeting.pop("_id", None)
    return meeting


@api_router.post("/analyze-meeting")
async def analyze_meeting(payload: AnalyzeIn):
    meeting = await get_meeting_or_404(payload.meeting_id)
    transcript = apply_speaker_map(meeting["transcript"], payload.speaker_map)

    try:
        result = await analyze_transcript(transcript)
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")

    update = {
        "transcript": transcript,
        "speaker_map": payload.speaker_map,
        "participants": [v for v in payload.speaker_map.values() if v] or meeting["speakers"],
        "summary": result["summary"],
        "decisions": result["decisions"],
        "opinions": result["opinions"],
        "information": result["information"],
        "actions": result["actions"],
        "status": "analyzed",
        "analyzed_at": now_iso(),
    }
    await db.meetings.update_one({"id": payload.meeting_id}, {"$set": update})
    return await get_meeting_or_404(payload.meeting_id)


@api_router.post("/extract-actions")
async def extract_actions(payload: AnalyzeIn):
    """Return only the extracted action items for a meeting (re-runs analysis if needed)."""
    meeting = await get_meeting_or_404(payload.meeting_id)
    if meeting.get("actions") is None:
        return (await analyze_meeting(payload))["actions"]
    return {"meeting_id": payload.meeting_id, "actions": meeting.get("actions", [])}


@api_router.post("/edit-action")
async def edit_action(payload: EditActionIn):
    meeting = await get_meeting_or_404(payload.meeting_id)
    actions = meeting.get("actions", [])
    found = False
    for a in actions:
        if a["id"] == payload.action_id:
            found = True
            if payload.person is not None:
                a["person"] = payload.person
            if payload.task is not None:
                a["task"] = payload.task
            if payload.deadline is not None:
                a["deadline"] = payload.deadline
            if payload.action_type is not None and payload.action_type in TOOL_LABELS:
                a["action_type"] = payload.action_type
                a["tool"] = TOOL_LABELS[payload.action_type]
            if payload.status is not None:
                a["status"] = payload.status
            elif payload.person or payload.task or payload.deadline or payload.action_type:
                a["status"] = "modified"
            break
    if not found:
        raise HTTPException(status_code=404, detail="Action not found")
    await db.meetings.update_one({"id": payload.meeting_id}, {"$set": {"actions": actions}})
    return await get_meeting_or_404(payload.meeting_id)


@api_router.post("/execute-action")
async def execute_action(payload: ExecuteIn):
    meeting = await get_meeting_or_404(payload.meeting_id)
    actions = meeting.get("actions", [])
    target = next((a for a in actions if a["id"] == payload.action_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Action not found")
    if target["status"] not in ("approved", "modified"):
        raise HTTPException(status_code=400, detail="Action must be approved before execution")

    at = target.get("action_type", "none")
    if at == "none" or at not in integrations.TOOL_DISPATCH:
        result = {"success": False, "demo": payload.demo_mode, "provider": "none",
                  "message": "No suitable tool for this action.", "detail": {}}
    else:
        fn = integrations.TOOL_DISPATCH[at]
        result = fn(target.get("task", ""), target.get("person", ""),
                    target.get("deadline", ""), demo_mode=payload.demo_mode)

    result["executed_at"] = now_iso()
    target["execution_result"] = result
    target["status"] = "executed" if result.get("success") else "failed"

    await db.meetings.update_one({"id": payload.meeting_id}, {"$set": {"actions": actions}})
    return {"meeting_id": payload.meeting_id, "action": target}


@api_router.get("/meeting/{meeting_id}")
async def get_meeting(meeting_id: str):
    return await get_meeting_or_404(meeting_id)


@api_router.get("/meetings")
async def list_meetings():
    docs = await db.meetings.find({}, {"_id": 0, "raw_transcript": 0}).sort("created_at", -1).to_list(50)
    return docs


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
