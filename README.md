# Requirements Studio (MVP)

Type your product idea → the AI (OpenAI) asks workflow questions → you answer → it writes a requirements doc (epics, user stories, acceptance criteria) you can download as Markdown.

You can download or copy the doc, or send it to Azure DevOps as Epics with User Stories under them.

## How sign-in works

Each organization signs in with its **own code**. An admin creates orgs and their codes on the
admin page (`/admin`), and sets each org's Azure DevOps connection there too.

- Codes look like `ABCD-EFGH-JKLM`. They're random and long enough that guessing isn't realistic.
- Codes are stored scrambled (hashed), so they're shown only once, when made. Lost one? Make a new one.
- Making a new code signs out everyone who used the old one. Deleting an org signs its people out too.
- Azure DevOps access tokens are stored encrypted with `SECRET_KEY`.

## Settings

| Setting | What it's for |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI key. Required. |
| `SECRET_KEY` | A long random string. Signs logins and encrypts saved tokens. Required. If it changes, everyone is signed out and saved Azure DevOps tokens have to be entered again. |
| `ADMIN_PASSWORD` | Password for the admin page. Required to manage orgs. |
| `DATABASE_URL` | A Postgres connection string (`POSTGRES_URL`, or the same names with a `REQ_` prefix from the Vercel Neon integration, also work). Required on Vercel (for example a free Neon database from the Vercel Marketplace). Without it the app uses a local `orgs.db` file, which only works on your own computer. |
| `OPENAI_MODEL` | Optional. Default `gpt-5`. |

## How it's built

- **The pages** are a Next.js (React) app: the `app/`, `components/` and `lib/` folders.
  Smooth scrolling is [Lenis](https://lenis.darkroom.engineering/), animations are
  [GSAP](https://gsap.com/), and the effects in `components/reactbits/` come from
  [React Bits](https://reactbits.dev/) (split-letter titles, blur-in text, count-up numbers,
  magnetic buttons, spotlight cards, the scroll-speed marquee and click sparks).
- **The engine** is the Python (Flask) app in `app.py`. It only answers `/api/...` requests:
  sign-in, the AI calls, saved documents, usage and the admin actions.
- On Vercel, both deploy together: Next.js serves the pages and `api/index.py` runs the Python app.

## Run it

You need two terminals: one for the Python engine, one for the pages.

```bash
# Terminal 1: the Python API (port 5328)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your-key-here                          # https://platform.openai.com/api-keys
export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
export ADMIN_PASSWORD=pick-an-admin-password
python app.py

# Terminal 2: the pages (port 3000)
npm install
npm run dev
```

Then open http://localhost:3000 (landing page). Go to `/admin` to create an org and get its code,
then sign in at `/login` with that code. The tool is at `/app`.

## Usage tracking

Every AI call (questions, document, Azure DevOps send) records how many tokens it used and which
org made it.

- Each org sees its own usage at `/usage` (link in the app's top bar).
- The admin sees every org at `/admin/usage`, with a split by org, and sets the prices there
  (dollars per 1M input/output tokens) so the pages can show estimated cost.
- Charts show tokens per day for 7, 30 or 90 days, with hover details and a table view, plus a
  split by feature.

## Documents, feedback and privacy

- Every document is saved automatically. **My documents** (`/docs`) lists an org's documents;
  open one to read, edit (Edit tab, then Save changes), download, copy or send it again. Docs can be
  deleted there too. Orgs only ever see their own documents.
- On the questions step, **Ask more questions** adds 3 to 5 follow-up questions based on the answers so far.
- Under each document, people can rate it 👍/👎 and leave a comment. The admin sees all feedback at
  `/admin/feedback`, and can open the document it was left on.
- `/privacy` explains in plain words what's stored and who it's shared with. Review it before
  real customers use the app.
- Deleting an org also deletes its documents and feedback.

## Technical spec and AI coding tools

After a requirements document, **Create technical spec** asks 4 to 6 technical questions ("not sure"
is fine) and writes a spec: architecture, data model, screens and API, integrations, security,
edge cases, a test plan, and an implementation plan broken into small tasks. It's saved with the
document, and can be edited, downloaded or copied.

**Copy for coding AI** builds one ready-to-paste prompt (the spec plus the requirements, with
instructions to work task by task, write tests, and ask about open questions) for tools like
GitHub Copilot, Codex, Claude Code or Cursor.

## Export to AI coding tools

After the technical spec is written, "Build it with an AI coding tool" downloads a starter folder
(zip) for Codex, Claude Code, Cursor, GitHub Copilot, or any other tool. Each folder has
`docs/SPEC.md`, `docs/REQUIREMENTS.md`, a `START_HERE.md` with three steps, and the instructions
file that tool reads on its own: `AGENTS.md` (Codex and others), `CLAUDE.md` (Claude Code),
`.cursor/rules/requirements-studio.mdc` (Cursor) or `.github/copilot-instructions.md` (Copilot).
