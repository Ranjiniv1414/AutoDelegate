# AutoDelegate — PRD

## Original problem statement
Build **AutoDelegate — The Action-Oriented Meeting Agent**: a software-only agentic AI web app
that takes a meeting transcript or audio, understands who said what, extracts decisions and
action items, identifies the responsible person + deadline, decides the required follow-up
action, requires human approval, then executes via APIs (Jira / Gmail / Google Calendar) with a
clearly-labelled Demo Mode fallback.

## Architecture (as built)
- **Frontend**: React 19 + Tailwind + shadcn/ui + framer-motion. Single-page state machine:
  home → mapping → analysis → approval → execution, with a MEETING→UNDERSTAND→REASON→PLAN→APPROVE→EXECUTE stepper.
- **Backend**: FastAPI. Endpoints: `/api/upload-audio`, `/api/meetings`, `/api/analyze-meeting`,
  `/api/extract-actions`, `/api/edit-action`, `/api/execute-action`, `/api/meeting/{id}`, `/api/meetings`.
- **DB**: MongoDB `meetings` collection (transcript, speakers, speaker_map, summary, decisions,
  opinions, actions[] with status + execution_result).
- **AI**: Gemini 3.1 Pro (structured JSON analysis) + OpenAI Whisper (audio STT) via Emergent Universal Key.
- **Integrations** (`integrations.py`): real Jira REST / Gmail / Calendar calls when creds present,
  else clearly-labelled Demo Mode (demo:true, SIMULATED message, mock ids).

## User personas
- Hackathon presenter / team lead who wants meeting commitments turned into tracked actions.

## Core requirements (static)
- Speaker diarization shown as Speaker N (approximate); user maps to real names.
- Distinguish opinion vs decision vs action vs information; not every sentence becomes a task.
- Human approval mandatory before any external execution.
- Demo Mode obvious and non-deceptive.

## Implemented (2026-09-01)
- Full ingestion (paste transcript + audio upload w/ Whisper), speaker parsing + mapping.
- AI agent extraction → summary, decisions, opinions, action items (person/task/deadline/tool/confidence).
- Approval dashboard (approve/edit/reject, bulk approve/reject) + execution with live results.
- Demo Mode banner + toggle; real integration modules ready (Jira live-capable, Gmail/Calendar via OAuth token).
- README with install/run/config/demo instructions; sample meeting included.
- Tested: 13/13 backend, full frontend E2E — all passing.

## Backlog (P1/P2)
- P1: Persist + list past meetings in a sidebar (endpoint exists).
- P1: Real speaker diarization via a diarization model (currently LLM-approximate).
- P2: Gmail/Calendar OAuth flow inside the app (currently env access token).
- P2: Export execution audit log (JSON/CSV).
- P2: Slack integration as a 4th tool.

## Next tasks
- Await user feedback; consider P1 items above.
