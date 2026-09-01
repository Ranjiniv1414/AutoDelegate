"""
Integration modules for AutoDelegate.

Each function executes a real follow-up action against a third-party API when
credentials are configured, OR returns a clearly-labelled simulated result when
Demo Mode is active / credentials are missing.

Demo Mode NEVER pretends a real action happened – every simulated response has
`"demo": true` and a message that explicitly says "SIMULATED".
"""
import os
import uuid
import base64
from datetime import datetime, timezone

import requests


def _sim_id(prefix: str) -> str:
    return f"{prefix}-{str(uuid.uuid4())[:8].upper()}"


# --------------------------------------------------------------------------- #
# JIRA
# --------------------------------------------------------------------------- #
def create_jira_task(task: str, person: str, deadline: str = "", demo_mode: bool = True) -> dict:
    base_url = os.environ.get("JIRA_BASE_URL")
    email = os.environ.get("JIRA_EMAIL")
    api_token = os.environ.get("JIRA_API_TOKEN")
    project_key = os.environ.get("JIRA_PROJECT_KEY")

    creds_present = all([base_url, email, api_token, project_key])

    if demo_mode or not creds_present:
        ticket = _sim_id("DEMO")
        return {
            "success": True,
            "demo": True,
            "provider": "jira",
            "message": f"SIMULATED: Jira issue {ticket} would be created for {person or 'assignee'}.",
            "detail": {
                "ticket_id": ticket,
                "summary": task,
                "assignee": person,
                "due_date": deadline,
                "url": f"https://your-domain.atlassian.net/browse/{ticket}",
                "status": "To Do",
            },
        }

    # Real Jira REST API v3 call
    try:
        auth_str = base64.b64encode(f"{email}:{api_token}".encode()).decode()
        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": task,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {"type": "paragraph", "content": [
                            {"type": "text", "text": f"Owner: {person} | Deadline: {deadline}. Auto-created by AutoDelegate."}
                        ]}
                    ],
                },
                "issuetype": {"name": "Task"},
            }
        }
        resp = requests.post(
            f"{base_url.rstrip('/')}/rest/api/3/issue",
            json=payload,
            headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        key = data.get("key")
        return {
            "success": True,
            "demo": False,
            "provider": "jira",
            "message": f"Jira issue {key} created.",
            "detail": {"ticket_id": key, "summary": task, "assignee": person,
                       "url": f"{base_url.rstrip('/')}/browse/{key}", "status": "To Do"},
        }
    except Exception as e:
        return {"success": False, "demo": False, "provider": "jira",
                "message": f"Jira API error: {e}", "detail": {}}


# --------------------------------------------------------------------------- #
# GMAIL
# --------------------------------------------------------------------------- #
def create_gmail_draft(task: str, person: str, deadline: str = "", demo_mode: bool = True) -> dict:
    access_token = os.environ.get("GOOGLE_ACCESS_TOKEN")

    subject = f"Follow-up: {task}"
    body = (f"Hi {person or 'there'},\n\n"
            f"Following up on our meeting regarding: {task}.\n"
            f"{('Target date: ' + deadline) if deadline else ''}\n\n"
            f"Best regards,\nAutoDelegate")

    if demo_mode or not access_token:
        draft = _sim_id("DRAFT")
        return {
            "success": True,
            "demo": True,
            "provider": "gmail",
            "message": f"SIMULATED: Gmail draft {draft} would be created (not sent).",
            "detail": {"draft_id": draft, "recipient": person, "subject": subject,
                       "body_snippet": body[:140]},
        }

    try:
        raw = base64.urlsafe_b64encode(
            (f"To: {person}\r\nSubject: {subject}\r\n\r\n{body}").encode()
        ).decode()
        resp = requests.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
            json={"message": {"raw": raw}},
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "success": True, "demo": False, "provider": "gmail",
            "message": "Gmail draft created.",
            "detail": {"draft_id": data.get("id"), "recipient": person, "subject": subject,
                       "body_snippet": body[:140]},
        }
    except Exception as e:
        return {"success": False, "demo": False, "provider": "gmail",
                "message": f"Gmail API error: {e}", "detail": {}}


# --------------------------------------------------------------------------- #
# GOOGLE CALENDAR
# --------------------------------------------------------------------------- #
def create_calendar_event(task: str, person: str, deadline: str = "", demo_mode: bool = True) -> dict:
    access_token = os.environ.get("GOOGLE_ACCESS_TOKEN")

    when = deadline or "TBD"

    if demo_mode or not access_token:
        event = _sim_id("EVT")
        return {
            "success": True,
            "demo": True,
            "provider": "calendar",
            "message": f"SIMULATED: Google Calendar event {event} would be created.",
            "detail": {"event_id": event, "title": task, "when": when, "organizer": person,
                       "link": f"https://calendar.google.com/event?eid={event}"},
        }

    try:
        now = datetime.now(timezone.utc).isoformat()
        resp = requests.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            json={"summary": task, "description": f"Scheduled via AutoDelegate. When: {when}",
                  "start": {"dateTime": now}, "end": {"dateTime": now}},
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "success": True, "demo": False, "provider": "calendar",
            "message": "Google Calendar event created.",
            "detail": {"event_id": data.get("id"), "title": task, "when": when,
                       "organizer": person, "link": data.get("htmlLink")},
        }
    except Exception as e:
        return {"success": False, "demo": False, "provider": "calendar",
                "message": f"Calendar API error: {e}", "detail": {}}


# --------------------------------------------------------------------------- #
# SLACK
# --------------------------------------------------------------------------- #
def create_slack_message(task: str, person: str, deadline: str = "", demo_mode: bool = True) -> dict:
    webhook = os.environ.get("SLACK_WEBHOOK_URL")

    text = f":memo: *{task}*\nOwner: {person or 'team'}" + (f" · Due: {deadline}" if deadline else "")

    if demo_mode or not webhook:
        msg_id = _sim_id("MSG")
        return {
            "success": True,
            "demo": True,
            "provider": "slack",
            "message": f"SIMULATED: Slack update {msg_id} would be posted to your team channel.",
            "detail": {"message_id": msg_id, "channel": "#team-updates", "text": text,
                       "owner": person, "due": deadline},
        }

    try:
        resp = requests.post(webhook, json={"text": text}, timeout=20)
        resp.raise_for_status()
        return {
            "success": True, "demo": False, "provider": "slack",
            "message": "Slack message posted to channel.",
            "detail": {"channel": "webhook", "text": text, "owner": person, "due": deadline},
        }
    except Exception as e:
        return {"success": False, "demo": False, "provider": "slack",
                "message": f"Slack API error: {e}", "detail": {}}


TOOL_DISPATCH = {
    "jira": create_jira_task,
    "gmail": create_gmail_draft,
    "calendar": create_calendar_event,
    "slack": create_slack_message,
}
