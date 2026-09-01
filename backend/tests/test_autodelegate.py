"""AutoDelegate backend API tests."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to frontend/.env value (tests run inside container)
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

SAMPLE_TRANSCRIPT = """Ravi: Team, our top issue is that users can't log in after the new deploy. What do we know?
Priya: I've reproduced the login bug on staging — it's a token validation issue. I'll fix it by Friday.
Arun: Once Priya pushes the fix, I'll test it end-to-end on Saturday and confirm.
Ravi: Good. I think we should also improve error logging in the future.
Priya: I feel we could switch auth libraries eventually, but that's a bigger discussion.
Ravi: Let's schedule a review meeting Monday 10 AM to sign off on the release.
"""

SLACK_TRANSCRIPT = """Ravi: Quick sync. Priya, please fix the bug-fix for the payment webhook crashing on retries by Thursday.
Priya: Got it, I'll push the fix by Thursday.
Arun: I will post a project update to the team channel later today so everyone is in the loop.
Ravi: Great. Let's also meet Friday at 3 PM to review release readiness.
"""


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def meeting_id(session):
    r = session.post(f"{API}/meetings", json={"transcript": SAMPLE_TRANSCRIPT, "title": "TEST_login_bug"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "id" in d
    assert set(["Ravi", "Priya", "Arun"]).issubset(set(d["speakers"]))
    return d["id"]


# ---- meetings creation ----
class TestMeetings:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200

    def test_create_empty_transcript(self, session):
        r = session.post(f"{API}/meetings", json={"transcript": "   "})
        assert r.status_code == 400

    def test_get_meeting(self, session, meeting_id):
        r = session.get(f"{API}/meeting/{meeting_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == meeting_id
        assert d["status"] in ("transcribed", "analyzed")

    def test_get_missing(self, session):
        r = session.get(f"{API}/meeting/does-not-exist")
        assert r.status_code == 404


# ---- analyze ----
@pytest.fixture(scope="module")
def analyzed(session, meeting_id):
    r = session.post(f"{API}/analyze-meeting", json={"meeting_id": meeting_id, "speaker_map": {}}, timeout=120)
    assert r.status_code == 200, r.text
    return r.json()


class TestAnalyze:
    def test_summary_and_actions(self, analyzed):
        assert analyzed.get("summary")
        actions = analyzed.get("actions", [])
        assert isinstance(actions, list)
        assert len(actions) >= 3, f"expected >=3 actions, got {len(actions)}: {actions}"

    def test_action_routing(self, analyzed):
        actions = analyzed["actions"]
        # Priya -> fix -> jira
        priya = [a for a in actions if a.get("person", "").lower().startswith("priya")]
        arun = [a for a in actions if a.get("person", "").lower().startswith("arun")]
        ravi = [a for a in actions if a.get("person", "").lower().startswith("ravi")]
        assert priya, f"No Priya action: {actions}"
        assert arun, f"No Arun action: {actions}"
        assert ravi, f"No Ravi action: {actions}"
        assert any(a["action_type"] == "jira" for a in priya), f"Priya not jira: {priya}"
        assert any(a["action_type"] == "jira" for a in arun), f"Arun not jira: {arun}"
        assert any(a["action_type"] == "calendar" for a in ravi), f"Ravi not calendar: {ravi}"

    def test_opinions_not_all_tasks(self, analyzed):
        # opinions list should have content (Ravi's "improve logging", Priya's "switch libraries")
        opinions = analyzed.get("opinions", [])
        assert len(opinions) >= 1, f"No opinions parsed: {analyzed}"

    def test_analyze_missing_meeting(self, session):
        r = session.post(f"{API}/analyze-meeting", json={"meeting_id": "bogus", "speaker_map": {}})
        assert r.status_code == 404


# ---- edit + execute ----
class TestEditExecute:
    def test_execute_before_approval_rejected(self, session, meeting_id, analyzed):
        aid = analyzed["actions"][0]["id"]
        r = session.post(f"{API}/execute-action", json={"meeting_id": meeting_id, "action_id": aid, "demo_mode": True})
        assert r.status_code == 400

    def test_edit_action_fields(self, session, meeting_id, analyzed):
        aid = analyzed["actions"][0]["id"]
        r = session.post(f"{API}/edit-action", json={
            "meeting_id": meeting_id, "action_id": aid,
            "person": "TEST_Person", "task": "TEST_task", "deadline": "TEST_Friday", "action_type": "gmail",
        })
        assert r.status_code == 200
        d = r.json()
        act = next(a for a in d["actions"] if a["id"] == aid)
        assert act["person"] == "TEST_Person"
        assert act["task"] == "TEST_task"
        assert act["deadline"] == "TEST_Friday"
        assert act["action_type"] == "gmail"
        assert act["tool"] == "Gmail"
        assert act["status"] == "modified"

    def test_approve_and_execute_demo(self, session, meeting_id, analyzed):
        # approve second action
        aid = analyzed["actions"][1]["id"]
        r = session.post(f"{API}/edit-action", json={"meeting_id": meeting_id, "action_id": aid, "status": "approved"})
        assert r.status_code == 200
        act = next(a for a in r.json()["actions"] if a["id"] == aid)
        assert act["status"] == "approved"

        r = session.post(f"{API}/execute-action", json={"meeting_id": meeting_id, "action_id": aid, "demo_mode": True})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["action"]["status"] == "executed"
        er = d["action"]["execution_result"]
        assert er["success"] is True
        assert er["demo"] is True
        assert "SIMULATED" in er["message"]
        assert er["provider"] in ("jira", "gmail", "calendar", "none")

    def test_edit_missing_action(self, session, meeting_id):
        r = session.post(f"{API}/edit-action", json={"meeting_id": meeting_id, "action_id": "bogus", "status": "approved"})
        assert r.status_code == 404


# ---- upload-audio ----
class TestUploadAudio:
    def test_reject_bad_ext(self, session):
        # requests will set multipart form-data; drop json header for this call
        files = {"file": ("bad.txt", io.BytesIO(b"not audio"), "text/plain")}
        r = requests.post(f"{API}/upload-audio", files=files)
        assert r.status_code == 400


# ---- Slack routing + GET /api/meetings (new features) ----
@pytest.fixture(scope="module")
def slack_meeting(session):
    r = session.post(f"{API}/meetings", json={"transcript": SLACK_TRANSCRIPT, "title": "TEST_slack_routing"})
    assert r.status_code == 200, r.text
    return r.json()["id"]


@pytest.fixture(scope="module")
def slack_analyzed(session, slack_meeting):
    r = session.post(f"{API}/analyze-meeting", json={"meeting_id": slack_meeting, "speaker_map": {}}, timeout=120)
    assert r.status_code == 200, r.text
    return r.json()


class TestSlackRoutingAndHistory:
    def test_slack_action_present(self, slack_analyzed):
        actions = slack_analyzed.get("actions", [])
        slack_actions = [a for a in actions if a.get("action_type") == "slack"]
        assert slack_actions, f"No slack action produced. actions={actions}"
        s = slack_actions[0]
        assert s["tool"] == "Slack"

    def test_jira_and_calendar_still_route(self, slack_analyzed):
        actions = slack_analyzed.get("actions", [])
        assert any(a.get("action_type") == "jira" for a in actions), f"Missing jira action: {actions}"
        assert any(a.get("action_type") == "calendar" for a in actions), f"Missing calendar action: {actions}"

    def test_execute_slack_demo(self, session, slack_meeting, slack_analyzed):
        slack_action = next(a for a in slack_analyzed["actions"] if a["action_type"] == "slack")
        aid = slack_action["id"]
        # approve
        r = session.post(f"{API}/edit-action", json={"meeting_id": slack_meeting, "action_id": aid, "status": "approved"})
        assert r.status_code == 200
        # execute
        r = session.post(f"{API}/execute-action", json={"meeting_id": slack_meeting, "action_id": aid, "demo_mode": True})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["action"]["status"] == "executed"
        er = d["action"]["execution_result"]
        assert er["provider"] == "slack"
        assert er["demo"] is True
        assert er["success"] is True
        assert "SIMULATED" in er["message"]
        assert er["detail"].get("message_id", "").startswith("MSG-"), f"missing MSG-xxxx: {er}"

    def test_list_meetings(self, session, slack_meeting):
        r = session.get(f"{API}/meetings")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        m0 = data[0]
        # newest first ordering — our slack_meeting should be present in list
        ids = [m["id"] for m in data]
        assert slack_meeting in ids
        # required fields per request
        for key in ("id", "title", "source", "status", "created_at"):
            assert key in m0, f"missing {key} in {m0}"
        # raw_transcript should be stripped
        assert "raw_transcript" not in m0
        # actions field optional but present for analyzed meetings
        analyzed_meeting = next(m for m in data if m["id"] == slack_meeting)
        assert isinstance(analyzed_meeting.get("actions", []), list)

    def test_meetings_newest_first(self, session):
        r = session.get(f"{API}/meetings")
        data = r.json()
        if len(data) >= 2:
            assert data[0]["created_at"] >= data[1]["created_at"]

    def test_edit_action_slack_type(self, session, meeting_id, analyzed):
        aid = analyzed["actions"][0]["id"]
        r = session.post(f"{API}/edit-action", json={
            "meeting_id": meeting_id, "action_id": aid, "action_type": "slack",
        })
        assert r.status_code == 200
        act = next(a for a in r.json()["actions"] if a["id"] == aid)
        assert act["action_type"] == "slack"
        assert act["tool"] == "Slack"
