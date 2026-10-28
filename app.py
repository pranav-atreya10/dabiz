"""Requirements helper MVP.

Flow: person types their main idea -> the AI asks workflow/product-flow
questions -> person answers -> the AI writes a requirements doc to download.
"""

import hashlib
import hmac
import os
from functools import wraps

import openai
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from pydantic import BaseModel

import db
import devops
import usage

# Change the model without touching code by setting OPENAI_MODEL.
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5")

# Everyone shares one password, set with APP_PASSWORD. If it isn't set, the site stays locked.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "")

app = Flask(__name__)
# Login cookies are signed with a key made from the password, so changing it logs everyone out.
app.secret_key = hashlib.sha256(f"requirements-helper:{APP_PASSWORD}".encode()).digest()
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")

_db_ready = False


@app.before_request
def setup_db():
    """Create the tables the first time the app runs (when storage is available)."""
    global _db_ready
    if not _db_ready and db.available():
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


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if APP_PASSWORD and session.get("signed_in"):
            return view(*args, **kwargs)
        if request.path.startswith("/api/"):
            return jsonify(error="Your session has ended. Please refresh and sign in again."), 401
        return redirect(url_for("login"))

    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if not APP_PASSWORD:
        error = "This site is locked. The owner needs to set APP_PASSWORD."
    elif request.method == "POST":
        if hmac.compare_digest(request.form.get("password", "").encode(), APP_PASSWORD.encode()):
            session["signed_in"] = True
            return redirect(url_for("index"))
        error = "That password isn't right."
    elif session.get("signed_in"):
        return redirect(url_for("index"))
    return render_template("login.html", error=error, locked=not APP_PASSWORD)


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.get("/")
def home():
    return render_template("home.html")


@app.get("/app")
@login_required
def index():
    return render_template("index.html")


@app.post("/api/questions")
@login_required
def questions():
    idea = (request.json or {}).get("idea", "").strip()
    if not idea:
        return jsonify(error="Please type your idea first."), 400
    try:
        response = get_client().responses.parse(
            model=MODEL,
            instructions=QUESTIONS_SYSTEM,
            input=f"Main idea:\n{idea}",
            text_format=Questions,
        )
        usage.record(None, "questions", MODEL, response)
        if response.output_parsed is None:
            raise RuntimeError("The AI didn't return any questions. Try again.")
        return jsonify(questions=response.output_parsed.questions)
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


@app.post("/api/requirements")
@login_required
def requirements():
    data = request.json or {}
    idea = data.get("idea", "").strip()
    answers = data.get("answers", [])
    qa = "\n\n".join(
        f"Q: {a.get('question', '')}\nA: {a.get('answer', '').strip() or '(no answer)'}"
        for a in answers
    )
    try:
        response = get_client().responses.create(
            model=MODEL,
            instructions=DOC_SYSTEM,
            input=f"Main idea:\n{idea}\n\nQuestions and answers:\n{qa}",
        )
        usage.record(None, "document", MODEL, response)
        return jsonify(document=response.output_text)
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502



@app.get("/api/devops/status")
@login_required
def devops_status():
    return jsonify(configured=devops.is_configured(), project=devops.settings()["project"])


@app.post("/api/devops/send")
@login_required
def devops_send():
    document = (request.json or {}).get("document", "").strip()
    if not document:
        return jsonify(error="There's no document to send."), 400
    if not devops.is_configured():
        return jsonify(error="Azure DevOps isn't set up yet."), 400
    try:
        response = get_client().responses.parse(
            model=MODEL,
            instructions=PLAN_SYSTEM,
            input=document,
            text_format=Plan,
        )
        usage.record(None, "devops", MODEL, response)
        if response.output_parsed is None or not response.output_parsed.epics:
            raise RuntimeError("Couldn't find any epics in the document to send.")
        return jsonify(items=devops.send_plan(response.output_parsed))
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502



@app.get("/usage")
@login_required
def usage_page():
    return render_template(
        "usage.html", tracking=db.available(), scope="your team", show_orgs=False,
        can_edit_prices=True, prices_url=url_for("usage_prices"), api_url=url_for("usage_data"),
        nav=[("Tool", url_for("index"), False), ("Usage", url_for("usage_page"), True)],
        signout_url=url_for("logout"),
    )


@app.get("/api/usage")
@login_required
def usage_data():
    if not db.available():
        return jsonify(error="Usage tracking needs a database (DATABASE_URL)."), 503
    days = 90 if request.args.get("days") == "90" else 7 if request.args.get("days") == "7" else 30
    return jsonify(usage.summary(None, days=days))


@app.post("/usage/prices")
@login_required
def usage_prices():
    try:
        usage.set_prices(float(request.form.get("input") or 0), float(request.form.get("output") or 0))
    except ValueError:
        pass
    return redirect(url_for("usage_page"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
