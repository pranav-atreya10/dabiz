"""Requirements helper MVP.

Flow: person types their main idea -> the AI asks workflow/product-flow
questions -> person answers -> the AI writes a requirements doc to download.
"""

import os

import openai
from flask import Flask, jsonify, render_template, request
from pydantic import BaseModel

# Change the model without touching code by setting OPENAI_MODEL.
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5")

app = Flask(__name__)

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


def get_client():
    """Make the OpenAI client, with a clear error if the key isn't set."""
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("The server has no OpenAI API key set (OPENAI_API_KEY).")
    return openai.OpenAI()


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/questions")
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
        if response.output_parsed is None:
            raise RuntimeError("The AI didn't return any questions. Try again.")
        return jsonify(questions=response.output_parsed.questions)
    except (openai.OpenAIError, RuntimeError) as e:
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
        response = get_client().responses.create(
            model=MODEL,
            instructions=DOC_SYSTEM,
            input=f"Main idea:\n{idea}\n\nQuestions and answers:\n{qa}",
        )
        return jsonify(document=response.output_text)
    except (openai.OpenAIError, RuntimeError) as e:
        return jsonify(error=str(e)), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
