"""Starter kits for AI coding tools: a zip with the spec, the requirements, and the
instructions file each tool reads on its own."""

import io
import re
import zipfile

INSTRUCTIONS = """# Project instructions

This project is built from a spec written with Requirements Studio.

- Read `docs/SPEC.md` (the technical spec) and `docs/REQUIREMENTS.md` (what the product must do and why).
- Work through the Implementation plan in `docs/SPEC.md` in order, one task at a time.
- Write tests that prove each user story's acceptance criteria.
- If something is unclear, or listed under Open questions, ask before guessing.
- Keep each change small. After each task, say what you changed and how to check it.
"""

FIRST_MESSAGE = "Read the project instructions and docs/SPEC.md, then start with task 1 of the implementation plan."

# tool: (name, instructions file path, extra header for that file, how-to steps)
TOOLS = {
    "codex": ("Codex", "AGENTS.md", "", [
        "Unzip this folder and open a terminal in it.",
        "Run `codex`.",
        f'Paste: "{FIRST_MESSAGE}"',
    ]),
    "claude-code": ("Claude Code", "CLAUDE.md", "", [
        "Unzip this folder and open a terminal in it.",
        "Run `claude`.",
        f'Paste: "{FIRST_MESSAGE}"',
    ]),
    "cursor": ("Cursor", ".cursor/rules/requirements-studio.mdc",
               "---\ndescription: Build this project from the Requirements Studio spec\nalwaysApply: true\n---\n\n", [
        "Unzip this folder and open it in Cursor (File, Open Folder).",
        "Open the Agent chat.",
        f'Paste: "{FIRST_MESSAGE}"',
    ]),
    "copilot": ("GitHub Copilot", ".github/copilot-instructions.md", "", [
        "Unzip this folder and open it in VS Code.",
        "Open Copilot Chat and switch it to Agent mode.",
        f'Paste: "{FIRST_MESSAGE}"',
    ]),
    "other": ("other AI coding tools", "AGENTS.md", "", [
        "Unzip this folder and open it in your AI coding tool. Many tools read `AGENTS.md` automatically.",
        "If yours doesn't, ask it to read `AGENTS.md` first.",
        f'Then paste: "{FIRST_MESSAGE}"',
    ]),
}


def slug(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return (s[:50].rstrip("-") or "project")


def build_zip(tool, title, requirements, spec):
    """Return (filename, zip bytes) for one tool."""
    name, path, header, steps = TOOLS[tool]
    folder = slug(title)
    start = (f"# Start here: {title}\n\nThis folder is set up for {name}.\n\n"
             + "\n".join(f"{i}. {step}" for i, step in enumerate(steps, 1))
             + "\n\nThe spec is in `docs/SPEC.md` and the requirements are in `docs/REQUIREMENTS.md`.\n")
    files = {
        path: header + INSTRUCTIONS,
        "START_HERE.md": start,
        "docs/SPEC.md": spec.strip() + "\n",
        "docs/REQUIREMENTS.md": requirements.strip() + "\n",
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p, text in files.items():
            z.writestr(f"{folder}/{p}", text)
    return f"{folder}-{tool}.zip", buf.getvalue()
