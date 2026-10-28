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
| `DATABASE_URL` | A Postgres connection string. Required on Vercel (for example a free Neon database from the Vercel Marketplace). Without it the app uses a local `orgs.db` file, which only works on your own computer. |
| `OPENAI_MODEL` | Optional. Default `gpt-5`. |

## Run it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your-key-here                          # https://platform.openai.com/api-keys
export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
export ADMIN_PASSWORD=pick-an-admin-password
python app.py
```

Then open http://localhost:5000 (landing page). Go to `/admin` to create an org and get its code,
then sign in at `/login` with that code. The tool is at `/app`.

## Usage tracking

Every AI call (questions, document, Azure DevOps send) records how many tokens it used and which
org made it.

- Each org sees its own usage at `/usage` (link in the app's top bar).
- The admin sees every org at `/admin/usage`, with a split by org, and sets the prices there
  (dollars per 1M input/output tokens) so the pages can show estimated cost.
- Charts show tokens per day for 7, 30 or 90 days, with hover details and a table view, plus a
  split by feature.
