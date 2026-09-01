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
