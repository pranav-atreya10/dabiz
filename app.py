"""Requirements helper MVP.

Flow: person types their main idea -> the AI asks workflow/product-flow
questions -> person answers -> the AI writes a requirements doc to download.
"""

import hmac
import json
import os
from functools import wraps
from urllib.parse import urlparse

import openai
from flask import Flask, flash, g, jsonify, redirect, render_template, request, session, url_for
from pydantic import BaseModel

import db
import devops
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
    if urlparse(source).netloc != request.host:
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
Ask 6 to 8 short, concrete questions a non-technical person can answer."""

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


class Questions(BaseModel):
    questions: list[str]


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
        if request.path.startswith("/api/"):
            return jsonify(error="Your session has ended. Please refresh and sign in again."), 401
        return redirect(url_for("login"))

    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    locked = not (SECRET_KEY and db.available())
    if locked:
        error = "This site is locked. The owner needs to set SECRET_KEY and DATABASE_URL."
    elif request.method == "POST":
        org = db.find_org_by_code(request.form.get("code", ""))
        if org:
            session.update(org_id=org["id"], code_version=org["code_version"])
            return redirect(url_for("index"))
        error = "That org code isn't right."
    elif current_org():
        return redirect(url_for("index"))
    return render_template("login.html", error=error, locked=locked)


@app.post("/logout")
def logout():
    session.pop("org_id", None)
    session.pop("code_version", None)
    return redirect(url_for("login"))


# ---------- Admin: create orgs, give out codes, set each org's Azure DevOps ----------

def admin_token():
    """Saved in the admin's cookie, so changing ADMIN_PASSWORD signs every admin out."""
    return hmac.new(SECRET_KEY.encode(), ADMIN_PASSWORD.encode(), "sha256").hexdigest()


def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if SECRET_KEY and ADMIN_PASSWORD and db.available() and hmac.compare_digest(session.get("admin", ""), admin_token()):
            return view(*args, **kwargs)
        return redirect(url_for("admin_login"))

    return wrapper


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    locked = not (SECRET_KEY and ADMIN_PASSWORD and db.available())
    if locked:
        error = "The admin page is locked. The owner needs to set SECRET_KEY, ADMIN_PASSWORD and DATABASE_URL."
    elif request.method == "POST":
        if hmac.compare_digest(request.form.get("password", "").encode(), ADMIN_PASSWORD.encode()):
            session["admin"] = admin_token()
            return redirect(url_for("admin"))
        error = "That admin password isn't right."
    return render_template("admin_login.html", error=error, locked=locked)


@app.post("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin_login"))


@app.get("/admin")
@admin_required
def admin():
    return render_template("admin.html", orgs=db.list_orgs())


@app.post("/admin/orgs")
@admin_required
def admin_create_org():
    name = request.form.get("name", "").strip()
    if not name:
        flash("Give the org a name.", "error")
    else:
        org_id, code = db.create_org(name)
        flash(f"{name}|{code}", "code")
    return redirect(url_for("admin"))


@app.post("/admin/orgs/<int:org_id>/code")
@admin_required
def admin_new_code(org_id):
    org = db.get_org(org_id)
    if org:
        flash(f"{org['name']}|{db.regenerate_code(org_id)}", "code")
    return redirect(url_for("admin"))


@app.post("/admin/orgs/<int:org_id>/devops")
@admin_required
def admin_devops(org_id):
    f = request.form
    pat = None
    if f.get("clear_pat"):
        pat = ""
    elif f.get("pat", "").strip():
        pat = f["pat"]
    db.update_devops(org_id, f.get("org_url", ""), f.get("project", ""), f.get("story_type", ""), pat)
    flash("Azure DevOps settings saved.", "ok")
    return redirect(url_for("admin") + f"#org-{org_id}")


@app.get("/admin/feedback")
@admin_required
def admin_feedback():
    items = db.all_feedback()
    ups = sum(1 for i in items if i["rating"] == 1)
    return render_template("admin_feedback.html", items=items, ups=ups, downs=len(items) - ups)


@app.get("/admin/documents/<int:doc_id>")
@admin_required
def admin_document(doc_id):
    doc = db.get_document_any_org(doc_id)
    if not doc:
        return redirect(url_for("admin_feedback"))
    return render_template("admin_document.html", doc=doc)


@app.post("/admin/orgs/<int:org_id>/delete")
@admin_required
def admin_delete(org_id):
    org = db.get_org(org_id)
    if org:
        db.delete_org(org_id)
        flash(f"Deleted {org['name']} and its documents. Anyone signed in with its code is signed out.", "ok")
    return redirect(url_for("admin"))


@app.get("/")
def home():
    return render_template("home.html")


@app.get("/app")
@login_required
def index():
    return render_template("index.html", org=g.org)


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
        return jsonify(questions=response.output_parsed.questions)
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
        content = response.output_text
        doc_id = db.create_document(g.org["id"], idea, json.dumps(answers), content)
        return jsonify(document=content, id=doc_id, title=db.title_from(content))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


# ---------- Saved documents ----------

@app.get("/docs")
@login_required
def docs_page():
    return render_template("docs.html", org=g.org, docs=db.list_documents(g.org["id"]))


@app.get("/api/documents/<int:doc_id>")
@login_required
def get_document(doc_id):
    doc = db.get_document(g.org["id"], doc_id)
    if not doc:
        return jsonify(error="That document doesn't exist."), 404
    return jsonify(id=doc["id"], title=doc["title"], idea=doc["idea"], qa=json.loads(doc["qa"] or "[]"),
                   document=doc["content"], rating=doc["rating"], feedback=doc["feedback"])


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


@app.get("/privacy")
def privacy():
    return render_template("privacy.html")


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


@app.get("/usage")
@login_required
def usage_page():
    return render_template(
        "usage.html", tracking=True, scope=g.org["name"], show_orgs=False,
        can_edit_prices=False, api_url=url_for("usage_data"),
        nav=[("Tool", url_for("index"), False), ("Documents", url_for("docs_page"), False),
             ("Usage", url_for("usage_page"), True)],
        signout_url=url_for("logout"),
    )


@app.get("/api/usage")
@login_required
def usage_data():
    return jsonify(usage.summary(g.org["id"], days=_days()))


@app.get("/admin/usage")
@admin_required
def admin_usage():
    return render_template(
        "usage.html", tracking=True, scope="all orgs", show_orgs=True,
        can_edit_prices=True, prices_url=url_for("admin_prices"), api_url=url_for("admin_usage_data"),
        nav=[("Orgs", url_for("admin"), False), ("Usage", url_for("admin_usage"), True),
             ("Feedback", url_for("admin_feedback"), False)],
        signout_url=url_for("admin_logout"),
    )


@app.get("/admin/api/usage")
@admin_required
def admin_usage_data():
    data = usage.summary(all_orgs=True, days=_days())
    names = {o["id"]: o["name"] for o in db.list_orgs()}
    for row in data["by_org"]:
        row["name"] = names.get(row["org_id"], "Deleted org")
    return jsonify(data)


@app.post("/admin/usage/prices")
@admin_required
def admin_prices():
    try:
        usage.set_prices(float(request.form.get("input") or 0), float(request.form.get("output") or 0))
    except ValueError:
        flash("Prices must be numbers.", "error")
    return redirect(url_for("admin_usage"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
