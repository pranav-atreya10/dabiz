# Requirements Helper (MVP)

Type your product idea → Claude asks workflow questions → you answer → Claude writes a requirements doc (epics, user stories, acceptance criteria) you can download as Markdown.

Later this doc will be sent straight to Azure DevOps. For now it's download/copy only.

## Run it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your-key-here   # get one at https://console.anthropic.com
python app.py
```

Then open http://localhost:5000
