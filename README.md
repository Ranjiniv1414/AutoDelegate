# AutoDelegate — The Action-Oriented Meeting Agent

> **Turn meeting decisions into actions.**

AutoDelegate is an agentic AI web app that ingests a meeting transcript or audio, figures
out **who** committed to **what** by **when**, decides the right follow-up tool
(Jira / Gmail / Google Calendar), and — only after your approval — executes the action.

```
Meeting Audio / Transcript
  → Speech-to-Text (Whisper)
  → Speaker Diarization (approximate)
  → Speaker Name Mapping (you)
  → AI Agent (Gemini 3.1 Pro, structured JSON)
  → Extract WHO / WHAT / WHEN
  → Decide required action (Jira / Gmail / Calendar)
  → Human Approval
  → API Execution (real or Demo Mode)
  → Execution Result
```

The dashboard visualises the agent pipeline:
**MEETING → UNDERSTAND → REASON → PLAN → APPROVE → EXECUTE**

---

## Tech stack

| Layer     | Tech                                                   |
|-----------|--------------------------------------------------------|
| Frontend  | React 19, Tailwind, shadcn/ui, framer-motion           |
| Backend   | Python, FastAPI                                        |
| Database  | MongoDB (meetings, transcripts, actions, statuses)     |
| AI        | Gemini 3.1 Pro (analysis) + OpenAI Whisper (audio STT) |
| Actions   | Jira REST, Gmail API, Google Calendar API + Demo Mode  |

> This repo runs on the Emergent platform (React + FastAPI + MongoDB). The original brief
> mentioned Next.js + SQLite; the workflow and every feature are identical here.

---

## Project structure

```
/app
├── backend
│   ├── server.py          # FastAPI app + AI agent + all endpoints
│   ├── integrations.py    # Jira / Gmail / Calendar (real + Demo Mode)
│   ├── requirements.txt
│   ├── .env               # secrets (never committed)
│   └── .env.example       # where each API key goes
└── frontend
    └── src
        ├── App.js         # pipeline orchestration / state machine
        ├── lib/api.js     # axios client
        ├── data/samples.js
        ├── components/    # Header, PipelineStepper, StatusBadge
        └── views/         # Home, SpeakerMapping, Analysis, Approval, Execution
```

---

## 1. How to install

Backend:
```bash
cd backend
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

Frontend:
```bash
cd frontend
yarn install
```

## 2. Run the frontend
On Emergent it is managed by supervisor and already live. Locally:
```bash
cd frontend && yarn start      # http://localhost:3000
```

## 3. Run the backend
Managed by supervisor on Emergent. Locally:
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Restart on Emergent after `.env` changes: `sudo supervisorctl restart backend`

## 4. Configure APIs

All secrets live in `backend/.env`. See `backend/.env.example`.

**AI (already configured)** — `EMERGENT_LLM_KEY` powers both Gemini analysis and Whisper STT.

**Jira** (optional, for real execution):
```
JIRA_BASE_URL=https://your-domain.atlassian.net   # your Jira site
JIRA_EMAIL=you@example.com                         # Atlassian account email
JIRA_API_TOKEN=...                                 # id.atlassian.com/manage-profile/security/api-tokens
JIRA_PROJECT_KEY=AUTO                              # target project key
```

**Gmail + Google Calendar** (optional, for real execution):
```
GOOGLE_ACCESS_TOKEN=...   # OAuth2 access token with gmail.compose + calendar.events scopes
```

If any of these are missing, the corresponding tool automatically falls back to **Demo Mode**.

## 5. Test the audio workflow
1. Home → **Upload Audio** tab → drop an `.mp3/.wav/.m4a/.webm` (≤ 25 MB).
2. Click **Analyze Meeting** → Whisper transcribes, then the transcript is auto-segmented into
   `Speaker 1 / Speaker 2 …` (diarization is **approximate** — it does not know real names).
3. Map each speaker to a real name → **Confirm Participants**.
4. Review the AI analysis, approve actions, execute.

## 6. Test Demo Mode
- Keep the **Demo Mode** toggle (top-right) **ON** (default).
- A pulsing amber banner shows: *"external actions are SIMULATED"*.
- On execution, each result card is tagged **SIMULATED** with a mock `DEMO-XXXX` ticket / draft /
  event id. Nothing is sent to real Jira/Gmail/Calendar.
- Toggle **OFF** to attempt real execution (requires the keys above).

## 7. Demo to hackathon judges (2-minute script)
1. Open the app — point out the **MEETING → … → EXECUTE** pipeline and the amber Demo banner.
2. Click the **"Login Bug Standup"** sample, then **Analyze Meeting**.
3. Show speaker mapping (Ravi / Priya / Arun) → **Confirm Participants**.
4. Analysis screen: highlight the summary + that only **real commitments** became actions:
   - Priya → *Fix login bug* → Friday → **Jira**
   - Arun → *Test login fix* → Saturday → **Jira**
   - Ravi → *Review meeting* → Monday 10 AM → **Calendar**
5. Approval dashboard: **edit** one action, **approve all**, emphasise *nothing runs without approval*.
6. **Execute Approved Actions** → watch live status; open a simulated Jira link.
7. Flip Demo Mode OFF and explain the same modules call the real Jira/Gmail/Calendar APIs when keys are set.

---

## API endpoints

| Method | Path                        | Purpose                                   |
|--------|-----------------------------|-------------------------------------------|
| POST   | `/api/upload-audio`         | Transcribe audio (Whisper) + diarize      |
| POST   | `/api/meetings`             | Create meeting from pasted transcript     |
| POST   | `/api/analyze-meeting`      | AI agent extracts summary/decisions/actions |
| POST   | `/api/extract-actions`      | Return extracted action items             |
| POST   | `/api/edit-action`          | Edit / approve / reject an action         |
| POST   | `/api/execute-action`       | Execute one approved action (real / demo) |
| GET    | `/api/meeting/{id}`         | Fetch a meeting                           |

### Sample meeting for testing
```
Ravi: The login bug is still there.
Priya: I'll fix the login bug by Friday.
Arun: I'll test the fix on Saturday.
Ravi: Let's review the result on Monday at 10 AM.
```
