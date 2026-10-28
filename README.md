# Requirements Studio (MVP)

Type your product idea → the AI (OpenAI) asks workflow questions → you answer → it writes a requirements doc (epics, user stories, acceptance criteria) you can download as Markdown.

You can download or copy the doc, or send it to Azure DevOps as Epics with User Stories under them.

## Run it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your-key-here   # get one at https://platform.openai.com/api-keys
export APP_PASSWORD=pick-a-password    # everyone signs in with this
python app.py
```

Then open http://localhost:5000 (landing page). The tool itself is at /app, behind the password.

Optional: set `OPENAI_MODEL` to use a different OpenAI model (default: `gpt-5`).

## Connect Azure DevOps (optional)

Until these are set, the "Send to Azure DevOps" button stays off and the page says it isn't set up yet.

| Setting | What to put |
|---|---|
| `AZDO_ORG_URL` | `https://dev.azure.com/your-org` |
| `AZDO_PROJECT` | Your project name |
| `AZDO_PAT` | A Personal Access Token with **Work Items: Read & write** |
| `AZDO_STORY_TYPE` | Optional. Default `User Story`. Scrum projects use `Product Backlog Item` |

## Usage tracking

Every AI call (questions, document, Azure DevOps send) records how many tokens it used. See it at
`/usage`: totals, estimated cost, tokens per day (7/30/90 days, chart or table), and a split by
feature. Type your model's prices (dollars per 1M input/output tokens) on that page to see costs.

Tracking needs a database. Set `DATABASE_URL` to a Postgres connection string (for example a free
Neon database from the Vercel Marketplace). Without it the app still works; on your own computer it
uses a local `app.db` file, and on Vercel tracking is simply off.
