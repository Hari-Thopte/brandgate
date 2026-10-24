# Round 2 submission checklist

## Required links and files

- Working project link: `[[PUBLIC_APP_URL]]` — pending a public frontend/API deployment and smoke test. The current project is runnable locally; its localhost preview is not a public link.
- Source repository: `[[GITHUB_REPOSITORY_URL]]` — pending repository creation and push. Follow `GITHUB_UPLOAD.md`.
- Updated project PDF: `../../output/pdf/BrandGate_Round2_Project_Update.pdf`.
- Editable presentation: `../../output/pptx/BrandGate_Round2_Project_Update.pptx`.
- Source ZIP: `../../output/BrandGate_Round2_Source.zip` (generated after this document).

## Completed features in the local prototype

- No-sign-up landing, demo role switcher, sample-ad selection and analysis flow.
- Deterministic pipeline with stage progress, source IDs, exact-span validation, cache and saved sample fallback.
- Review workspace with highlighted findings and Accept/Edit/Dismiss controls; dismissals require a reason.
- Approval stepper, reviewer comments and audit timeline.
- Read-only Brand Hub (guidelines, terms, Facts Ledger) and AI & Privacy page.
- Local fallback workflow and route handling for review/audit pages.

## Technology and implementation

- Frontend: Vite, browser JavaScript modules, CSS.
- Backend: Python, FastAPI and Pydantic.
- Demo repository is in memory. Supabase schema/seed assets are reference-only; no live database/RLS is configured.
- Deterministic analysis and a committed sample fixture are active. Gemini/Claude calls are not connected.
- Full tech note and measured local timing caveats: `TECH_AND_IMPLEMENTATION.md`.

## Changes from Round 1 plan

- Kept ledger matching before optional model review and exact source/span grounding.
- Added sample fallback, local cache, stage timing metadata and audit/review UX.
- Simplified Round 2 runtime to a local Vite + FastAPI demo with in-memory data.
- Deferred public deployment, persistent Supabase/RLS and live LLM integration; details are in `CHANGES_FROM_ROUND1.md`.

## Three planned Round 3 improvements

1. Facts Ledger expiry alerts and staged CSV/PDF upload with human approval.
2. Guideline Health based on reviewed dismissal reasons.
3. Evaluation Harness with versioned labelled cases, per-rule metrics and regression runs.

Full plan: `ROUND3_IMPROVEMENTS.md` and `../ROUND3_PLAN.md`.
