from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid, os, json, re
from datetime import datetime, timezone
import google.generativeai as genai

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-1.5-flash")

meetings = {}

def now_iso():
    return datetime.now(timezone.utc).isoformat()

class TranscriptRequest(BaseModel):
    transcript: str = ""
    title: str = "Untitled Meeting"

class MeetingIdRequest(BaseModel):
    meeting_id: str

class AnalyzeRequest(BaseModel):
    meeting_id: str
    speaker_map: dict = {}

class EditActionRequest(BaseModel):
    meeting_id: str
    action_id: str
    person: str = None
    task: str = None
    deadline: str = None
    action_type: str = None
    status: str = None

class ExecuteRequest(BaseModel):
    meeting_id: str
    action_id: str
    demo_mode: bool = True

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/upload-audio")
def upload_audio():
    mid = str(uuid.uuid4())
    meetings[mid] = {"id": mid, "title": "Audio Meeting", "source": "audio",
                     "transcript": "Speaker 1: This is a mock transcript.",
                     "speakers": ["Speaker 1"], "speaker_map": {},
                     "status": "transcribed", "created_at": now_iso()}
    return meetings[mid]

@app.post("/api/meetings")
def create_meeting(request: TranscriptRequest):
    mid = str(uuid.uuid4())
    speakers = list(set(re.findall(r"^([A-Z][a-zA-Z]+):", request.transcript, re.MULTILINE)))
    meetings[mid] = {"id": mid, "title": request.title or "Untitled Meeting",
                     "source": "transcript", "transcript": request.transcript,
                     "speakers": speakers or ["Speaker 1"], "speaker_map": {},
                     "status": "transcribed", "created_at": now_iso()}
    return meetings[mid]

def call_gemini(prompt: str) -> dict:
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end+1]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini error: {e}")
        return {}

@app.post("/api/analyze-meeting")
def analyze_meeting(request: AnalyzeRequest):
    mid = request.meeting_id
    if mid not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    transcript = meetings[mid].get("transcript", "")

    prompt = f"""You are an expert meeting analyst. Read this meeting transcript and extract:
1. A 2-3 sentence executive summary
2. Key decisions made
3. Information shared
4. Action items - each with: speaker (label from transcript), person (name), statement (original quote), task (concise description), deadline (if mentioned), action_type (one of: jira, gmail, calendar, slack, none)

Return ONLY valid JSON in this exact shape:
{{
  "summary": "...",
  "decisions": ["..."],
  "information": ["..."],
  "actions": [
    {{"speaker": "...", "person": "...", "statement": "...", "task": "...", "deadline": "...", "action_type": "jira"}}
  ]
}}

Transcript:
{transcript}
"""
    result = call_gemini(prompt)
    actions = []
    for a in result.get("actions", []):
        actions.append({
            "id": str(uuid.uuid4()),
            "person": a.get("person", ""),
            "speaker": a.get("speaker", ""),
            "statement": a.get("statement", ""),
            "task": a.get("task", ""),
            "deadline": a.get("deadline", ""),
            "action_type": a.get("action_type", "none"),
            "tool": {"jira": "Jira", "gmail": "Gmail", "calendar": "Google Calendar",
                     "slack": "Slack", "none": "None"}.get(a.get("action_type", "none"), "None"),
            "confidence": 0.9, "status": "pending", "execution_result": None,
        })
    meetings[mid].update({
        "summary": result.get("summary", "Analysis complete."),
        "decisions": result.get("decisions", []),
        "opinions": [],
        "information": result.get("information", []),
        "actions": actions,
        "status": "analyzed", "analyzed_at": now_iso(),
    })
    return meetings[mid]

@app.post("/api/generate-roadmap")
def generate_roadmap(request: MeetingIdRequest):
    mid = request.meeting_id
    if mid not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    transcript = meetings[mid].get("transcript", "")
    summary = meetings[mid].get("summary", "")

    prompt = f"""Based on this meeting, create a project roadmap.
Summary: {summary}
Transcript: {transcript}

Return ONLY valid JSON:
{{
  "project_name": "...",
  "objective": "...",
  "recommended_stack": [{{"name": "...", "category": "...", "why": "...", "url": "https://..."}}],
  "phases": [{{"name": "...", "timeline": "...", "goal": "...", "milestone": "...",
              "tasks": [{{"task": "...", "owner": "...", "deadline": "..."}}]}}],
  "risks": ["..."]
}}
"""
    roadmap = call_gemini(prompt)
    meetings[mid]["roadmap"] = roadmap
    meetings[mid]["roadmap"]["generated_at"] = now_iso()
    return meetings[mid]

@app.post("/api/roadmap-to-actions")
def roadmap_to_actions(request: MeetingIdRequest):
    mid = request.meeting_id
    if mid not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    added = 0
    roadmap = meetings[mid].get("roadmap", {})
    existing = {a.get("task", "").lower() for a in meetings[mid].get("actions", [])}
    for phase in roadmap.get("phases", []):
        for t in phase.get("tasks", []):
            task = t.get("task", "").strip()
            if task and task.lower() not in existing:
                meetings[mid].setdefault("actions", []).append({
                    "id": str(uuid.uuid4()), "person": t.get("owner", ""),
                    "speaker": "", "statement": f"[Roadmap · {phase.get('name','')}] {task}",
                    "task": task, "deadline": t.get("deadline", ""),
                    "action_type": "jira", "tool": "Jira", "confidence": 1.0,
                    "status": "pending", "execution_result": None, "source": "roadmap",
                })
                existing.add(task.lower())
                added += 1
    result = meetings[mid]
    result["roadmap_actions_added"] = added
    return result

@app.get("/api/meetings")
def list_meetings():
    return list(meetings.values())

@app.get("/api/meeting/{meeting_id}")
def get_meeting(meeting_id: str):
    if meeting_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meetings[meeting_id]

@app.post("/api/edit-action")
def edit_action(request: EditActionRequest):
    mid = request.meeting_id
    if mid not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for a in meetings[mid].get("actions", []):
        if a["id"] == request.action_id:
            if request.person is not None: a["person"] = request.person
            if request.task is not None: a["task"] = request.task
            if request.deadline is not None: a["deadline"] = request.deadline
            if request.status is not None: a["status"] = request.status
            if request.action_type is not None:
                a["action_type"] = request.action_type
                a["tool"] = {"jira": "Jira", "gmail": "Gmail",
                             "calendar": "Google Calendar", "slack": "Slack",
                             "none": "None"}.get(request.action_type, "None")
            break
    return meetings[mid]

@app.post("/api/execute-action")
def execute_action(request: ExecuteRequest):
    mid = request.meeting_id
    if mid not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for a in meetings[mid].get("actions", []):
        if a["id"] == request.action_id:
            a["status"] = "executed"
            a["execution_result"] = {
                "success": True, "demo": True,
                "message": "External actions are simulated. Real Gmail/Jira/Calendar integration requires OAuth setup."
            }
            return {"meeting_id": mid, "action": a}
    raise HTTPException(status_code=404, detail="Action not found")