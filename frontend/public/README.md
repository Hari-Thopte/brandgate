# BrandGate demo

Illustrative local prototype for reviewing marketing copy against bundled demo brand rules and Facts Ledger records. Deterministic checks run first. Model review is optional. Review data is kept in API memory or browser storage and is not connected to Supabase.

## Run locally

From the project root, run `npm run dev`. The frontend and FastAPI service start together. Use `npm test`, `npm run build`, `npm run typecheck`, `npm run lint`, and `npm run e2e` for checks.

The included BrightDay copy and brand records are demo data. A reviewer must accept, edit, or dismiss each finding before approval.
