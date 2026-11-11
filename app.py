"""Requirements Studio: the API behind the pages.

The pages themselves are a Next.js app (the app/ folder). This file is the "engine":
sign-in, the AI calls, saved documents, usage and the admin actions, all under /api/.

Flow: person types their main idea -> the AI asks workflow/product-flow
questions -> person answers -> the AI writes a requirements doc to download.
"""

import hmac
import json
import os
import re
from functools import wraps
from urllib.parse import urlparse

import openai
from flask import Flask, Response, g, jsonify, request, session
from pydantic import BaseModel

import db
import devops
import export
import usage

# Change the model without touching code by setting OPENAI_MODEL.
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5")

# Each org signs in with its own code (made on the admin page). SECRET_KEY signs login
# cookies and encrypts saved Azure DevOps tokens; ADMIN_PASSWORD opens the admin page.
# If either is missing, or there's no database to keep orgs in, that part of the site stays locked.
SECRET_KEY = os.environ.get("SECRET_KEY", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

app = Flask(__name__)
app.secret_key = SECRET_KEY or os.urandom(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")

_db_ready = False


@app.before_request
def same_site_posts_only():
    """Block posts and other changes that come from other websites (cross-site request forgery).

    Without this, another site could post an attacker's org code to /login and silently
    sign a visitor into the attacker's org. Browsers always send Origin (or at least
    Referer) on form posts, so a post without either is refused too.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return None
    source = request.headers.get("Origin") or request.headers.get("Referer") or ""
    # Behind the Next.js dev server (or Vercel), the address the visitor used is in X-Forwarded-Host.
    hosts = {request.host, request.headers.get("X-Forwarded-Host", "").split(",")[0].strip()}
    if urlparse(source).netloc not in hosts:
        return jsonify(error="That request came from another site, so it was blocked."), 403
    return None


@app.before_request
def setup_db():
    """Create the tables the first time the app runs (when storage is available)."""
    global _db_ready
    if not _db_ready and SECRET_KEY and db.available():
        db.init()
        _db_ready = True


QUESTIONS_SYSTEM = """You help product teams turn a rough idea into clear product requirements.
Given someone's main idea, ask the specific questions a product manager would need answered
to write good requirements. Focus on workflows and product flow: who the users are, what they
do step by step, what triggers each step, what happens on success and failure, what data moves
between screens or tools, and what "done" looks like. Do NOT ask about technical architecture,
databases, hosting, or programming languages.
Ask 6 to 8 short, concrete questions a non-technical person can answer.""" + """

For each question, also give 2 to 4 likely answers as options: a short label (2 to 6 words)
and a one-sentence description of what that choice means. Make the options different from each
other and realistic for this idea. Don't add an "Other" option; the app adds one."""

DOC_SYSTEM = """You write clear product requirements documents from an idea plus answers to
follow-up questions. Write in Markdown with these sections:

# <Product name>
## Summary
## Users
## Main workflows (numbered steps for each)
## Epics and user stories
For each epic: a "### Epic: <name>" heading, then user stories written as
"**As a** <user>, **I want** <goal>, **so that** <reason>" each followed by an
"Acceptance criteria" bullet list.
## Open questions

Only use what the person said or what clearly follows from it. If something is unknown,
put it under Open questions instead of making it up."""


MORE_QUESTIONS_SYSTEM = QUESTIONS_SYSTEM + """
You already asked some questions, and the person answered. Ask 3 to 5 NEW questions that fill
the biggest remaining gaps, based on their answers. Don't repeat or rephrase earlier questions."""


SPEC_QUESTIONS_SYSTEM = """You are a senior software architect. You'll get a product requirements document.
Ask 4 to 6 short technical questions you need answered to write an implementation spec, such as:
what it runs on (web, mobile, desktop), existing systems or tools it must connect to, where the
data lives and how sensitive it is, how people sign in and what roles exist, expected number of
users, and any required languages, frameworks or hosting. Skip anything the document already
answers. Phrase each question so a non-expert can answer it, or say "not sure".

For each question, also give 2 to 4 likely answers as options: a short label (2 to 6 words)
and a one-sentence description of what that choice means for the build. Don't add an "Other"
or "Not sure" option; the app handles those."""

SPEC_SYSTEM = """You are a senior software architect. Turn a product requirements document, plus answers
to technical questions, into a technical specification that an engineer or an AI coding tool can
build from. Write Markdown with these sections:

# <Product name>: Technical specification
## Overview
## Assumptions
(Where an answer was missing or "not sure", choose a sensible default and list it here.)
## Architecture
(The main components and how they talk to each other.)
## Data model
(Each entity with its fields and types.)
## Screens and API
(Each screen, and each API endpoint with method, path, request and response.)
## Integrations
## Security and permissions
## Non-functional requirements
(Performance, scale, reliability, accessibility.)
## Edge cases and error handling
## Test plan
(Tests that prove each user story's acceptance criteria.)
## Implementation plan
(Numbered tasks in build order, each small enough for one pull request.)
## Open questions

Be concrete and consistent with the requirements. Don't invent business rules: if something
isn't decided, put it under Open questions."""


class Option(BaseModel):
    label: str
    description: str


class Question(BaseModel):
    question: str
    options: list[Option]


class Questions(BaseModel):
    questions: list[Question]


class Story(BaseModel):
    title: str
    description: str
    acceptance_criteria: list[str]


class Epic(BaseModel):
    title: str
    description: str
    stories: list[Story]


class Plan(BaseModel):
    epics: list[Epic]


PLAN_SYSTEM = """Turn this requirements document into work items. Make one epic for each epic in
the document, with its user stories under it. Story titles should be short (under 80 characters);
put the full "As a ..., I want ..., so that ..." sentence in the story description. Copy the
acceptance criteria as a list. Don't add epics or stories that aren't in the document."""


# Applied to everything the AI writes, so documents read like a person wrote them.
WRITING_RULES = """

Writing style. Follow every rule:
- Never use em dashes or en dashes in sentences. Use commas, periods, colons or parentheses.
- Use plain, everyday words. Never write: delve, tapestry, testament, pivotal, seamless,
  leverage, robust, crucial, moreover, furthermore, "in today's digital world",
  "it is important to note", "here's the thing", "let that sink in", "let's dive in",
  "despite these challenges", "serves as" (write "is"), "experts say", "in conclusion".
- Don't write "it's not X, it's Y" contrasts. Don't group things in threes out of habit.
- No greetings, praise or sign-offs: no "Great question", "Certainly", "You're absolutely
  right", "I hope this helps", "Would you like me to". Never mention being an AI.
- No emojis. Don't bold random phrases; only use bold where the format above asks for it.
- Write headings in sentence case, not Title Case.
- Write normal sentences and paragraphs, or the lists the format asks for. Don't stack
  one-line paragraphs for effect.
- No placeholders like [your name], no links, and don't cite unnamed experts or studies."""

QUESTIONS_SYSTEM += WRITING_RULES
MORE_QUESTIONS_SYSTEM += WRITING_RULES
DOC_SYSTEM += WRITING_RULES
SPEC_QUESTIONS_SYSTEM += WRITING_RULES
SPEC_SYSTEM += WRITING_RULES
PLAN_SYSTEM += WRITING_RULES


def plain(text):
    """Backup for the style rules: swap dashes used as punctuation for commas.
    Number ranges like 2–4 (no spaces) are left alone."""
    text = re.sub(r"\s*—\s*", ", ", text)
    return re.sub(r"\s+–\s+", ", ", text)


def plain_questions(questions):
    out = []
    for q in questions:
        d = q.model_dump()
        d["question"] = plain(d["question"])
        for o in d["options"]:
            o["label"], o["description"] = plain(o["label"]), plain(o["description"])
        out.append(d)
    return out


def get_client():
    """Make the OpenAI client, with a clear error if the key isn't set."""
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("The server has no OpenAI API key set (OPENAI_API_KEY).")
    return openai.OpenAI()


def current_org():
    """The signed-in org, or None. Signs out anyone whose org was deleted or whose code was changed."""
    org_id = session.get("org_id")
    if not SECRET_KEY or not db.available() or org_id is None:
        return None
    org = db.get_org(org_id)
    if not org or org["code_version"] != session.get("code_version"):
        session.pop("org_id", None)
        return None
    return org


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        g.org = current_org()
        if g.org:
            return view(*args, **kwargs)
        return jsonify(error="Your session has ended. Please refresh and sign in again."), 401
    return wrapper


def site_locked():
    return not (SECRET_KEY and db.available())


def admin_locked():
    return not (SECRET_KEY and ADMIN_PASSWORD and db.available())


def when(value):
    """A date and time as short text, like 2026-10-31 14:05."""
    return str(value or "")[:16]


@app.get("/api/me")
def me():
    """Who is signed in. The pages (Next.js) use this to decide what to show."""
    org = current_org()
    return jsonify(org={"name": org["name"]} if org else None, admin=is_admin(),
                   locked=site_locked(), admin_locked=admin_locked())


@app.post("/api/login")
def login():
    if site_locked():
        return jsonify(error="This site is locked. The owner needs to set SECRET_KEY and DATABASE_URL."), 503
    org = db.find_org_by_code(str((request.json or {}).get("code", "")))
    if not org:
        return jsonify(error="That org code isn't right."), 401
    session.update(org_id=org["id"], code_version=org["code_version"])
    return jsonify(ok=True, org={"name": org["name"]})


@app.post("/api/logout")
def logout():
    session.pop("org_id", None)
    session.pop("code_version", None)
    return jsonify(ok=True)


# ---------- Admin: create orgs, give out codes, set each org's Azure DevOps ----------

def admin_token():
    """Saved in the admin's cookie, so changing ADMIN_PASSWORD signs every admin out."""
    return hmac.new(SECRET_KEY.encode(), ADMIN_PASSWORD.encode(), "sha256").hexdigest()


def is_admin():
    return bool(not admin_locked() and hmac.compare_digest(session.get("admin", ""), admin_token()))


def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if is_admin():
            return view(*args, **kwargs)
        return jsonify(error="Please sign in as admin."), 401
    return wrapper


def org_json(org):
    """An org for the admin page. The access token itself is never sent, only whether one is saved."""
    has_pat = bool(org["azdo_pat_encrypted"])
    return {
        "id": org["id"], "name": org["name"],
        "azdo_org_url": org["azdo_org_url"] or "", "azdo_project": org["azdo_project"] or "",
        "azdo_story_type": org["azdo_story_type"] or "User Story", "has_pat": has_pat,
        "connected": bool(org["azdo_org_url"] and org["azdo_project"] and has_pat),
    }


@app.post("/api/admin/login")
def admin_login():
    if admin_locked():
        return jsonify(error="The admin page is locked. The owner needs to set SECRET_KEY, ADMIN_PASSWORD and DATABASE_URL."), 503
    password = str((request.json or {}).get("password", ""))
    if not hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode()):
        return jsonify(error="That admin password isn't right."), 401
    session["admin"] = admin_token()
    return jsonify(ok=True)


@app.post("/api/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return jsonify(ok=True)


@app.get("/api/admin/orgs")
@admin_required
def admin_orgs():
    return jsonify(orgs=[org_json(o) for o in db.list_orgs()])


@app.post("/api/admin/orgs")
@admin_required
def admin_create_org():
    name = str((request.json or {}).get("name", "")).strip()[:120]
    if not name:
        return jsonify(error="Give the org a name."), 400
    org_id, code = db.create_org(name)
    return jsonify(id=org_id, name=name, code=code)


@app.post("/api/admin/orgs/<int:org_id>/code")
@admin_required
def admin_new_code(org_id):
    org = db.get_org(org_id)
    if not org:
        return jsonify(error="That org doesn't exist."), 404
    return jsonify(name=org["name"], code=db.regenerate_code(org_id))


@app.post("/api/admin/orgs/<int:org_id>/devops")
@admin_required
def admin_devops(org_id):
    f = request.json or {}
    if not db.get_org(org_id):
        return jsonify(error="That org doesn't exist."), 404
    pat = None
    if f.get("clear_pat"):
        pat = ""
    elif str(f.get("pat", "")).strip():
        pat = str(f["pat"])
    db.update_devops(org_id, str(f.get("org_url", "")), str(f.get("project", "")), str(f.get("story_type", "")), pat)
    return jsonify(ok=True, org=org_json(db.get_org(org_id)))


@app.delete("/api/admin/orgs/<int:org_id>")
@admin_required
def admin_delete(org_id):
    org = db.get_org(org_id)
    if org:
        db.delete_org(org_id)
    return jsonify(ok=True)


@app.get("/api/admin/feedback")
@admin_required
def admin_feedback():
    items = db.all_feedback()
    ups = sum(1 for i in items if i["rating"] == 1)
    return jsonify(ups=ups, downs=len(items) - ups, items=[
        {"id": i["id"], "title": i["title"], "rating": i["rating"], "feedback": i["feedback"] or "",
         "org_name": i["org_name"] or "", "when": when(i["feedback_at"])} for i in items
    ])


@app.get("/api/admin/documents/<int:doc_id>")
@admin_required
def admin_document(doc_id):
    doc = db.get_document_any_org(doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    return jsonify(id=doc["id"], title=doc["title"], org_name=doc["org_name"] or "", rating=doc["rating"],
                   feedback=doc["feedback"] or "", idea=doc["idea"], content=doc["content"])


def _qa_text(qa):
    return "\n\n".join(
        f"Q: {str(a.get('question', ''))}\nA: {str(a.get('answer', '')).strip() or '(no answer)'}" for a in qa
    )


@app.post("/api/questions")
@login_required
def questions():
    data = request.json or {}
    idea = str(data.get("idea", "")).strip()
    previous = data.get("previous") or []
    if not idea:
        return jsonify(error="Please type your idea first."), 400
    try:
        if previous:
            instructions = MORE_QUESTIONS_SYSTEM
            prompt = f"Main idea:\n{idea}\n\nQuestions asked so far, with answers:\n{_qa_text(previous)}"
        else:
            instructions, prompt = QUESTIONS_SYSTEM, f"Main idea:\n{idea}"
        response = get_client().responses.parse(
            model=MODEL,
            instructions=instructions,
            input=prompt,
            text_format=Questions,
        )
        usage.record(g.org["id"], "questions", MODEL, response)
        if response.output_parsed is None:
            raise RuntimeError("The AI didn't return any questions. Try again.")
        return jsonify(questions=plain_questions(response.output_parsed.questions))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


@app.post("/api/requirements")
@login_required
def requirements():
    data = request.json or {}
    idea = str(data.get("idea", "")).strip()
    answers = [a for a in data.get("answers", []) if isinstance(a, dict)]
    try:
        response = get_client().responses.create(
            model=MODEL,
            instructions=DOC_SYSTEM,
            input=f"Main idea:\n{idea}\n\nQuestions and answers:\n{_qa_text(answers)}",
        )
        usage.record(g.org["id"], "document", MODEL, response)
        content = plain(response.output_text)
        doc_id = db.create_document(g.org["id"], idea, json.dumps(answers), content)
        return jsonify(document=content, id=doc_id, title=db.title_from(content))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


# ---------- Saved documents ----------

@app.get("/api/documents")
@login_required
def list_documents():
    return jsonify(documents=[
        {"id": d["id"], "title": d["title"], "rating": d["rating"], "updated": when(d["updated_at"])}
        for d in db.list_documents(g.org["id"])
    ])


@app.get("/api/documents/<int:doc_id>")
@login_required
def get_document(doc_id):
    doc = db.get_document(g.org["id"], doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    return jsonify(id=doc["id"], title=doc["title"], idea=doc["idea"], qa=json.loads(doc["qa"] or "[]"),
                   document=doc["content"], spec=doc["spec"], spec_qa=json.loads(doc["spec_qa"] or "[]"),
                   rating=doc["rating"], feedback=doc["feedback"])


@app.put("/api/documents/<int:doc_id>")
@login_required
def save_document(doc_id):
    content = str((request.json or {}).get("document", ""))
    if not content.strip():
        return jsonify(error="The document can't be empty."), 400
    if not db.get_document(g.org["id"], doc_id):
        return jsonify(error="That document doesn't exist."), 404
    db.update_document(g.org["id"], doc_id, content)
    return jsonify(ok=True, title=db.title_from(content))


@app.delete("/api/documents/<int:doc_id>")
@login_required
def delete_document(doc_id):
    db.delete_document(g.org["id"], doc_id)
    return jsonify(ok=True)


@app.post("/api/documents/<int:doc_id>/feedback")
@login_required
def document_feedback(doc_id):
    data = request.json or {}
    rating = data.get("rating")
    if rating not in (1, -1):
        return jsonify(error="Pick thumbs up or thumbs down."), 400
    if not db.get_document(g.org["id"], doc_id):
        return jsonify(error="That document doesn't exist."), 404
    db.set_feedback(g.org["id"], doc_id, rating, str(data.get("comment", "")).strip()[:2000])
    return jsonify(ok=True)


# ---------- Technical spec ----------

@app.post("/api/documents/<int:doc_id>/spec/questions")
@login_required
def spec_questions(doc_id):
    doc = db.get_document(g.org["id"], doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    try:
        response = get_client().responses.parse(
            model=MODEL,
            instructions=SPEC_QUESTIONS_SYSTEM,
            input=doc["content"],
            text_format=Questions,
        )
        usage.record(g.org["id"], "spec_questions", MODEL, response)
        if response.output_parsed is None:
            raise RuntimeError("The AI didn't return any questions. Try again.")
        return jsonify(questions=plain_questions(response.output_parsed.questions))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


@app.post("/api/documents/<int:doc_id>/spec")
@login_required
def write_spec(doc_id):
    doc = db.get_document(g.org["id"], doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    answers = [a for a in (request.json or {}).get("answers", []) if isinstance(a, dict)]
    try:
        response = get_client().responses.create(
            model=MODEL,
            instructions=SPEC_SYSTEM,
            input=f"Requirements document:\n{doc['content']}\n\nTechnical questions and answers:\n{_qa_text(answers)}",
        )
        usage.record(g.org["id"], "spec", MODEL, response)
        spec = plain(response.output_text)
        db.save_spec(g.org["id"], doc_id, spec, json.dumps(answers))
        return jsonify(spec=spec)
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


@app.put("/api/documents/<int:doc_id>/spec")
@login_required
def save_spec(doc_id):
    spec = str((request.json or {}).get("spec", ""))
    if not spec.strip():
        return jsonify(error="The spec can't be empty."), 400
    if not db.get_document(g.org["id"], doc_id):
        return jsonify(error="That document doesn't exist."), 404
    db.save_spec(g.org["id"], doc_id, spec)
    return jsonify(ok=True)


@app.get("/api/documents/<int:doc_id>/export/<tool>")
@login_required
def export_for_tool(doc_id, tool):
    """Download a starter folder (zip) for an AI coding tool."""
    if tool not in export.TOOLS:
        return jsonify(error="Unknown coding tool."), 404
    doc = db.get_document(g.org["id"], doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    if not doc["spec"].strip():
        return jsonify(error="Create the technical spec first."), 400
    filename, data = export.build_zip(tool, doc["title"], doc["content"], doc["spec"])
    return Response(data, mimetype="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/devops/status")
@login_required
def devops_status():
    return jsonify(configured=devops.is_configured(g.org), project=g.org["azdo_project"])


@app.post("/api/devops/send")
@login_required
def devops_send():
    document = (request.json or {}).get("document", "").strip()
    if not document:
        return jsonify(error="There's no document to send."), 400
    if not devops.is_configured(g.org):
        return jsonify(error="Azure DevOps isn't set up for your org yet."), 400
    try:
        response = get_client().responses.parse(
            model=MODEL,
            instructions=PLAN_SYSTEM,
            input=document,
            text_format=Plan,
        )
        usage.record(g.org["id"], "devops", MODEL, response)
        if response.output_parsed is None or not response.output_parsed.epics:
            raise RuntimeError("Couldn't find any epics in the document to send.")
        return jsonify(items=devops.send_plan(response.output_parsed, g.org))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


def _days():
    return {"7": 7, "90": 90}.get(request.args.get("days"), 30)


@app.get("/api/usage")
@login_required
def usage_data():
    return jsonify(usage.summary(g.org["id"], days=_days()))


@app.get("/api/admin/usage")
@admin_required
def admin_usage_data():
    data = usage.summary(all_orgs=True, days=_days())
    names = {o["id"]: o["name"] for o in db.list_orgs()}
    for row in data["by_org"]:
        row["name"] = names.get(row["org_id"], "Deleted org")
    return jsonify(data)


@app.post("/api/admin/usage/prices")
@admin_required
def admin_prices():
    f = request.json or {}
    try:
        usage.set_prices(float(f.get("input") or 0), float(f.get("output") or 0))
    except (TypeError, ValueError):
        return jsonify(error="Prices must be numbers."), 400
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(debug=True, port=5328)
