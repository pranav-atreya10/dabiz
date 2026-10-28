"""Send a requirements plan to Azure DevOps as Epics with child User Stories.

Set these to turn it on:
  AZDO_ORG_URL     e.g. https://dev.azure.com/your-org
  AZDO_PROJECT     the project name
  AZDO_PAT         a Personal Access Token with "Work Items: Read & write"
  AZDO_STORY_TYPE  optional, default "User Story" (Scrum projects use "Product Backlog Item")
"""

import base64
import html
import json
import os
import urllib.error
import urllib.request
from urllib.parse import quote

API_VERSION = "7.1"


def settings():
    return {
        "org_url": os.environ.get("AZDO_ORG_URL", "").rstrip("/"),
        "project": os.environ.get("AZDO_PROJECT", ""),
        "pat": os.environ.get("AZDO_PAT", ""),
        "story_type": os.environ.get("AZDO_STORY_TYPE", "User Story"),
    }


def is_configured():
    s = settings()
    return bool(s["org_url"] and s["project"] and s["pat"])


def _to_html(text, bullets=()):
    parts = [f"<p>{html.escape(text)}</p>"] if text else []
    if bullets:
        parts.append("<ul>" + "".join(f"<li>{html.escape(b)}</li>" for b in bullets) + "</ul>")
    return "".join(parts)


def _post(url, token, body):
    """POST a JSON Patch body. Returns (status, parsed JSON or raw text)."""
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json-patch+json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            status, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode(errors="replace")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Couldn't reach Azure DevOps: {e.reason}")
    try:
        return status, json.loads(raw)
    except ValueError:
        return status, raw


def _create(token, s, item_type, title, description_html, parent_url=None):
    ops = [
        {"op": "add", "path": "/fields/System.Title", "value": title[:255]},
        {"op": "add", "path": "/fields/System.Description", "value": description_html},
    ]
    if parent_url:
        ops.append({
            "op": "add",
            "path": "/relations/-",
            "value": {"rel": "System.LinkTypes.Hierarchy-Reverse", "url": parent_url},
        })
    url = (f"{s['org_url']}/{quote(s['project'])}/_apis/wit/workitems/"
           f"${quote(item_type)}?api-version={API_VERSION}")
    status, item = _post(url, token, ops)
    # A bad token gets a 401, or a 203 with a sign-in web page instead of JSON.
    if status == 401 or (status < 400 and not isinstance(item, dict)):
        raise RuntimeError("Azure DevOps rejected the access token (AZDO_PAT).")
    if status >= 400:
        message = item.get("message", "") if isinstance(item, dict) else item
        raise RuntimeError(f"Azure DevOps error ({status}): {message[:300]}")
    return {
        "id": item["id"],
        "type": item_type,
        "title": title,
        "api_url": item["url"],
        "web_url": item.get("_links", {}).get("html", {}).get("href", ""),
    }


def send_plan(plan):
    """Create one Epic per plan epic, with its stories as children. Returns the created items."""
    s = settings()
    token = base64.b64encode(f":{s['pat']}".encode()).decode()
    created = []
    for epic in plan.epics:
        e = _create(token, s, "Epic", epic.title, _to_html(epic.description))
        e["children"] = []
        for story in epic.stories:
            desc = _to_html(story.description)
            if story.acceptance_criteria:
                desc += "<p><b>Acceptance criteria</b></p>" + _to_html("", story.acceptance_criteria)
            child = _create(token, s, s["story_type"], story.title, desc, parent_url=e["api_url"])
            e["children"].append(child)
        created.append(e)
    return created
