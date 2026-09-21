from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscriptRequest(BaseModel):
    transcript: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/roadmap-to-actions")
def analyze_meeting(request: TranscriptRequest):
    # A simple mock response so your frontend works
    return {
        "tasks": [
            {"owner": "Priya", "task": "Fix the login bug", "deadline": "Friday", "tool": "Jira"},
            {"owner": "Arun", "task": "Test the fix", "deadline": "Saturday", "tool": "Jira"}
        ]
    }