# Requirements Studio (MVP)

Type your product idea → the AI (OpenAI) asks workflow questions → you answer → it writes a requirements doc (epics, user stories, acceptance criteria) you can download as Markdown.

Later this doc will be sent straight to Azure DevOps. For now it's download/copy only.

## Run it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your-key-here   # get one at https://platform.openai.com/api-keys
export APP_PASSWORD=pick-a-password    # everyone signs in with this
python app.py
```

Then open http://localhost:5000

Optional: set `OPENAI_MODEL` to use a different OpenAI model (default: `gpt-5`).
