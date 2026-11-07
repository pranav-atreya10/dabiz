# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Product people at large companies who have a rough product idea and need it turned into something engineers can build. The first customer and interviewee is a partner-level engineering leader at Microsoft and his team. Admins (the founder) create company accounts and watch usage.

## Product Purpose
Requirements Studio turns a rough product idea into clear requirements. The AI asks the workflow and product-flow questions a good product manager would ask, one card at a time, then writes a requirements document. From there it writes a technical spec, sends epics and user stories to Azure DevOps, and exports a starter kit for AI coding tools. Success: a team goes from a one-line idea to work items and a buildable spec in one sitting.

## Positioning
It asks before it writes. The questions come first, so the document reflects the team's real workflow instead of a generic template, and the output lands directly in the tools the team already uses (Azure DevOps, Codex, Claude Code, Cursor, GitHub Copilot).

## Operating Context
- Flask app with Jinja templates, deployed on Vercel, Postgres (Neon). OpenAI models do the writing.
- Each company signs in with an org code. Admin pages manage orgs, Azure DevOps settings, prices, feedback and usage.
- The app flow is four steps: idea, questions, requirements document, technical spec, then export or send to Azure DevOps.
- Saved documents, token usage charts, feedback ratings and a privacy page exist.

## Capabilities and Constraints
- Real features only: question cards, document editing, spec writing, Azure DevOps work item creation (Epic + User Story, Agile process), ZIP export per coding tool, usage tracking with dollar estimates.
- Light and dark mode follow the device setting.
- Must work at phone width.
- Payments are undecided.

## Brand Commitments
- Name: Requirements Studio.
- Writing avoids AI-sounding copy: no em dashes, no "delve/seamless/leverage/robust", no "it's not X, it's Y", no rule-of-three lists, sentence-case headings.

## Evidence on Hand
- No customers, testimonials, user counts or benchmarks yet. Never fabricate them.
- Names of tools the app really integrates with (Azure DevOps, Codex, Claude Code, Cursor, GitHub Copilot) may be shown.
- Visual reference screenshots chosen by the founder: `design/references/`.

## Product Principles
- Questions before answers.
- Output goes where the team already works.
- Show only what is real.
- Plain language a busy engineer trusts.
