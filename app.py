"""Requirements helper MVP.

Flow: person types their main idea -> Claude asks workflow/product-flow
questions -> person answers -> Claude writes a requirements doc to download.
"""

import json
import os

import anthropic
from flask import Flask, jsonify, render_template, request

MODEL = "claude-opus-5-5"

app = Flask(__name__)
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

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

QUESTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["questions"],
    "additionalProperties": False,
}


def ask_claude(system, user_text, output_config=None):
    """Send one request to Claude and return the text of the reply."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("The server has no Claude API key set (ANTHROPIC_API_KEY).")
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",  # if this model declines, the API retries on a fallback model
        system=system,
        messages=[{"role": "user", "content": user_text}],
        output_config=output_config or {"effort": "medium"},
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined this request. Try rewording your idea.")
    return "".join(block.text for block in response.content if block.type == "text")


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/questions")
def questions():
    idea = (request.json or {}).get("idea", "").strip()
    if not idea:
        return jsonify(error="Please type your idea first."), 400
    try:
        text = ask_claude(
            QUESTIONS_SYSTEM,
            f"Main idea:\n{idea}",
            {"effort": "medium", "format": {"type": "json_schema", "schema": QUESTIONS_SCHEMA}},
        )
        return jsonify(questions=json.loads(text)["questions"])
    except (anthropic.APIError, RuntimeError, ValueError, KeyError) as e:
        return jsonify(error=str(e)), 502


@app.post("/api/requirements")
def requirements():
    data = request.json or {}
    idea = data.get("idea", "").strip()
    answers = data.get("answers", [])
    qa = "\n\n".join(
        f"Q: {a.get('question', '')}\nA: {a.get('answer', '').strip() or '(no answer)'}"
        for a in answers
    )
    try:
        doc = ask_claude(DOC_SYSTEM, f"Main idea:\n{idea}\n\nQuestions and answers:\n{qa}")
        return jsonify(document=doc)
    except (anthropic.APIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
