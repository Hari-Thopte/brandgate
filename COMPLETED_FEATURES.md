# Completed features — BrandGate Round 2 prototype

## Available in the local demo

- BrandGate landing page, Reviewer/Creator/Manager demo role switcher, and no-account start flow.
- Five bundled copy examples, an auto-growing manuscript editor, `.txt`/`.md` import, character and word counts, and a rule-pack count.
- FastAPI-backed deterministic analysis with stage reporting, grounded source IDs, exact spans, cache/fallback behavior, and readiness checks.
- A three-pane review workspace with severity groups, a selected finding detail, manuscript highlights, source evidence, revision preview, keyboard navigation, and a mobile pane switcher.
- Human Accept/Edit/Dismiss decisions, dismissal reasons, reviewer comments, approval gate, audit timeline, audit-chain verification, and Markdown/JSON/print actions.
- Read-only Brand Hub, AI & Privacy explanation, persistent Light/Dark preference, and local Playwright/contrast checks.
- One-command local development launcher and deployment templates.

## Explicit limitations

- The Gemini/Claude provider is not implemented or configured. Deterministic checks remain available; any live AI review should be treated as unavailable in this build.
- The API uses in-memory demo storage. It is not connected to Supabase or durable audit storage; browser-only offline fallback data stays in that browser.
- No hosted public URL or production credentials were supplied, so hosted cold-start and judge-flow checks remain unverified.
- Health-claim and competitor-comparison sample copy is provided for review, but dedicated rule categories for those claims are not implemented.
