from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for meetings
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
    meetings[mid] = {
        "id": mid, "title": "Audio Meeting", "source": "audio",
        "transcript": "Speaker 1: This is a mock transcript.",
        "speakers": ["Speaker 1"], "speaker_map": {},
        "status": "transcribed", "created_at": now_iso(),
    }
    return meetings[mid]

@app.post("/api/meetings")
def create_meeting(request: TranscriptRequest):
    mid = str(uuid.uuid4())
    meetings[mid] = {
        "id": mid, "title": request.title or "Untitled Meeting",
        "source": "transcript", "transcript": request.transcript,
        "speakers": ["Karthik", "Meena", "Ravi", "Divya"], "speaker_map": {},
        "status": "transcribed", "created_at": now_iso(),
    }
    return meetings[mid]

@app.post("/api/analyze-meeting")
def analyze_meeting(request: AnalyzeRequest):
    mid = request.meeting_id
    if mid not in meetings:
        meetings[mid] = {"id": mid, "transcript": "", "speakers": [], "speaker_map": {}}
    actions = [
        {"id": str(uuid.uuid4()), "person": "Meena", "speaker": "Meena",
         "statement": "I'll send the database structure to Karthik by Friday evening.",
         "task": "Send database structure to Karthik", "deadline": "Friday evening",
         "action_type": "gmail", "tool": "Gmail", "confidence": 0.95,
         "status": "pending", "execution_result": None},
        {"id": str(uuid.uuid4()), "person": "Divya", "speaker": "Divya",
         "statement": "I'll prepare the testing checklist before Monday.",
         "task": "Prepare testing checklist", "deadline": "Monday",
         "action_type": "jira", "tool": "Jira", "confidence": 0.9,
         "status": "pending", "execution_result": None},
        {"id": str(uuid.uuid4()), "person": "Ravi", "speaker": "Ravi",
         "statement": "Let's have another review meeting on Monday at 10 AM.",
         "task": "Schedule review meeting", "deadline": "Monday 10 AM",
         "action_type": "calendar", "tool": "Google Calendar", "confidence": 0.9,
         "status": "pending", "execution_result": None},
    ]
    meetings[mid].update({
        "summary": "The team discussed the Campus Event Management System. Meena will share the database structure, Divya will prepare the testing checklist, and a review meeting is scheduled for Monday.",
        "decisions": ["Team will have another review meeting on Monday at 10 AM."],
        "opinions": [],
        "information": ["Karthik needs the event and registration database structure for the admin dashboard."],
        "actions": actions,
        "status": "analyzed", "analyzed_at": now_iso(),
    })
    return meetings[mid]

@app.post("/api/generate-roadmap")
def generate_roadmap(request: MeetingIdRequest):
    mid = request.meeting_id
    if mid not in meetings:
        meetings[mid] = {"id": mid, "actions": []}
    meetings[mid]["roadmap"] = {
        "project_name": "Campus Event Management System",
        "objective": "Build a complete event management platform for the campus.",
        "recommended_stack": [
            {"name": "React", "category": "Frontend", "why": "Component-based UI", "url": "https://react.dev"},
            {"name": "FastAPI", "category": "Backend", "why": "Fast Python API framework", "url": "https://fastapi.tiangolo.com"},
            {"name": "MongoDB", "category": "Database", "why": "Flexible document store", "url": "https://www.mongodb.com"},
        ],
        "phases": [
            {"name": "Phase 1: Foundation", "timeline": "Week 1", "goal": "Set up the database and core structure",
             "milestone": "Database schema and admin dashboard ready",
             "tasks": [
                 {"task": "Design database schema", "owner": "Meena", "deadline": "Friday", "recommended_tools": [{"name": "MongoDB", "why": "Document database", "url": "https://www.mongodb.com"}]},
                 {"task": "Build admin dashboard structure", "owner": "Karthik", "deadline": "Week 1", "recommended_tools": [{"name": "React", "why": "UI library", "url": "https://react.dev"}]},
             ]},
            {"name": "Phase 2: Testing", "timeline": "Week 2", "goal": "Prepare and execute test plan",
             "milestone": "All critical features tested",
             "tasks": [
                 {"task": "Prepare testing checklist", "owner": "Divya", "deadline": "Monday", "recommended_tools": [{"name": "Playwright", "why": "E2E testing", "url": "https://playwright.dev"}]},
             ]},
        ],
        "risks": ["Timeline may slip if database schema is delayed"],
        "generated_at": now_iso(),
    }
    return meetings[mid]

@app.post("/api/roadmap-to-actions")
def roadmap_to_actions(request: MeetingIdRequest):
    mid = request.meeting_id
    if mid not in meetings:
        meetings[mid] = {"id": mid, "actions": []}
    added = 0
    roadmap = meetings[mid].get("roadmap", {})
    existing = {a.get("task", "").lower() for a in meetings[mid].get("actions", [])}
    for phase in roadmap.get("phases", []):
        for t in phase.get("tasks", []):
            task = t.get("task", "").strip()
            if task and task.lower() not in existing:
                meetings[mid].setdefault("actions", []).append({
                    "id": str(uuid.uuid4()), "person": t.get("owner", ""), "speaker": "",
                    "statement": f"[Roadmap · {phase.get('name','')}] {task}",
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
        return {"detail": "Meeting not found"}
    return meetings[meeting_id]

@app.post("/api/edit-action")
def edit_action(request: EditActionRequest):
    mid = request.meeting_id
    if mid not in meetings:
        return {"detail": "Meeting not found"}
    for a in meetings[mid].get("actions", []):
        if a["id"] == request.action_id:
            if request.person is not None: a["person"] = request.person
            if request.task is not None: a["task"] = request.task
            if request.deadline is not None: a["deadline"] = request.deadline
            if request.status is not None: a["status"] = request.status
            break
    return meetings[mid]

@app.post("/api/execute-action")
def execute_action(request: ExecuteRequest):
    mid = request.meeting_id
    if mid not in meetings:
        return {"detail": "Meeting not found"}
    for a in meetings[mid].get("actions", []):
        if a["id"] == request.action_id:
            a["status"] = "executed"
            a["execution_result"] = {"success": True, "demo": True, "message": "Simulated execution in demo mode"}
            return {"meeting_id": mid, "action": a}
    return {"detail": "Action not found"}