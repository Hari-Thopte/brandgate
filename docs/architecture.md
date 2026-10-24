# Architecture

Local vertical slice: Vite frontend → FastAPI → deterministic pipeline → in-memory demo repository. The in-memory repository has explicit demo-only scope; production persistence is intended for Supabase Postgres with RLS and API-level `org_id` filters.

Pipeline order: 1 ingest and hash, 2 sanitize, 3 deterministic checks, 4 rule retrieval, 5 ledger match, 6 optional grounded LLM review, 7 grounding validation, 8 merge and score, 9 human review, 10 append-only audit. Ledger matching precedes LLM review (see ADR-001).

The analysis endpoint runs stages sequentially and exposes the current stage and per-stage timings. The committed sample JSON is the fallback when a stage fails; it is checked against source IDs and exact spans before return. Optional model review is currently unavailable and shown as skipped. Reported stage timings include a short progress-display delay in this prototype. The demo reset route clears local demo state.

The frontend also bundles demo guidelines, terms, ledger entries and sample copy so these reference screens load without a backend. It uses a history-based router for `/`, `/start`, `/review/:id`, `/review/:id/audit`, `/queue`, `/hub/guidelines`, `/hub/terms`, `/hub/ledger`, and `/privacy`; Vercel rewrites deep links to the SPA entry point. `/queue` is a scope-aware placeholder. If API readiness is unavailable after 7.5 seconds, the browser creates a local deterministic analysis and records decisions and an integrity-checkable audit chain in local storage. Local fallback is a demo recovery path, not persistence or LLM behavior.
