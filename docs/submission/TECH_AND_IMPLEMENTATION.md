# Technical implementation and verification

## Stack and pipeline

- Frontend: Vite, browser ES modules, CSS. Backend: Python/FastAPI/Pydantic. Local demo data lives in process memory.
- Eight analysis stages currently exposed: Ingest → Sanitize → Deterministic checks → Rule retrieval → Ledger match → Grounded LLM review (unavailable) → Grounding validator → Merge & score. Human review and audit are subsequent user actions.
- Ledger matching precedes the optional model stage. The current implementation does not call Gemini or Claude; it uses deterministic checks and a committed sample fixture.
- Findings are returned only with a known seeded source ID and matching source substring. Findings with invalid sources/spans are filtered.
- SHA-256 normalized-content cache exists in process memory. The planted sample also uses a stored, validated fallback fixture. Neither survives a server restart.
- Backend has a 64 KB request cap and a lightweight per-process client request limit. CORS is configured by exact `ALLOWED_ORIGINS` plus local development and Vercel preview patterns.

## Security and storage boundary

This is a single-organization local demo. Supabase schema/seed files are reference material only; no live project, RLS policy execution, or cross-organization security test against a database is claimed. API organization checks in this demo are not a substitute for production tenancy. Do not submit confidential campaign copy to the demo.

## Test commands

From the project root: `npm install --prefix frontend`, `npm test --prefix frontend`, `npm run build --prefix frontend`, and from `backend/`: `python -m pytest`. The deploy verifier is `python scripts/verify_deploy.py --frontend-url ... --api-url ...`; live browser smoke is `npx playwright test` after installing the optional Playwright dev dependency and browser. Vite is pinned to 8.2.1; a lockfile could not be generated in the restricted network environment.

## Timing measurements

Local timing run: 20 cache misses and 20 warm cache hits against the running local API on Python 3.13. These are prototype timings, not production results. Each stage currently includes a fixed ~130 ms progress-display sleep, so the stage values primarily measure that delay rather than useful compute. The cache does not reduce end-to-end time because this progress delay runs on both paths.

| Measurement | Runs | p50 | p95 | Notes |
| --- | ---: | ---: | ---: | --- |
| Sample ad cache miss | 20 | 1,044.44 ms | 1,045.22 ms | Local; includes fixed stage delays. |
| Sample ad cache hit | 20 | 1,044.39 ms | 1,045.17 ms | Local; no observable speedup in this prototype. |
| Each of 8 stages, miss | 20 each | ~130.3–130.5 ms | ~130.6–130.9 ms | Rounded ranges across stages; stage values include the intentional ~130 ms delay. |
| Each of 8 stages, hit | 20 each | ~130.3–130.4 ms | ~130.6–130.8 ms | Rounded ranges across stages; stage values include the intentional ~130 ms delay. |

## Verification limits

The public frontend/API URLs and hosting credentials have not been provided. Production CORS, cold starts, incognito/second-browser behavior, Lighthouse, and hosted smoke remain unverified. Browser automation is disabled by the current Work settings, so no screenshots or visual contact sheet were captured in this session.
