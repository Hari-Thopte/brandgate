# BrandGate

Round 2 prototype: paste marketing copy, inspect grounded findings, and record human review decisions.

## Architecture and pipeline

```text
Vite browser app ──HTTP/JSON──> FastAPI demo API ──> in-memory demo repository
                                       │
                                       ├─ deterministic checks + seeded rules/ledger
                                       └─ stored sample fallback (optional LLM is not connected)

Planned, not connected: Supabase Postgres/RLS and Gemini/Claude provider layer.
```

Analysis stages: 1) ingest/hash, 2) sanitize, 3) deterministic checks, 4) rule retrieval, 5) ledger match, 6) optional grounded LLM review (currently unavailable), 7) exact source/span validation, 8) merge/score; then 9) human finding decisions and 10) append-only demo audit events. Ledger matching runs before model review. Sample results use a committed fixture when needed.

Stack: Vite 8.2.1 and browser ES modules; Python 3.11 target, FastAPI, Pydantic, and pinned backend requirements. Local verification currently ran on Python 3.13; see the submission implementation note for actual measured timings and limitations.

## Local demo (Windows PowerShell)

From the repository root, install frontend dependencies once, then start both servers together:

```powershell
npm install --prefix frontend
python -m pip install -r backend/requirements.txt
npm run dev
```

The launcher prints the URLs. Defaults are frontend `http://127.0.0.1:5178` and API `http://127.0.0.1:8011/health/ready`; set `FRONTEND_PORT`, `API_PORT`, `PYTHON` or `VITE_API_URL` to override them. In an activated Python virtual environment, set `PYTHON` only if the `python` command does not point to it. Open the frontend URL and choose **Try the demo brand**. No account is required.

The API root `/` is not a webpage; interactive API docs are at `/docs`. `GET /health` is liveness and `GET /ready` / `/health/ready` report demo readiness and whether an optional LLM key is present. The LLM provider itself is not connected in this prototype.

The Copy Desk interface uses self-hosted Fraunces, Instrument Sans, and JetBrains Mono. The Light/Dark control follows the operating-system theme on first visit and stores a later user choice in browser storage. Landing, start, review, and audit screenshots are captured under `qa/`.

The local demo uses an in-memory repository and deterministic fixture data. `backend/supabase/schema.sql` documents the planned 16-table Supabase schema and RLS. The sample fallback result is committed at `backend/app/fallbacks/sample.json`. No external model or database credentials are required for the sample workflow. Set keys only in environment variables when configuring live integrations.

The frontend uses a 10-second per-request timeout and retries idempotent GET requests up to three times. POSTs are never retried automatically. If live API requests fail, the app switches to its clearly labeled offline review and offers **Retry live**. Offline decisions and audit entries stay in that browser session and are not sent to the API.

### Hosted frontend configuration

Set the frontend build environment variable `VITE_API_URL` to the deployed FastAPI HTTPS base URL in the hosting provider's Production and Preview environments, then redeploy. Production rejects HTTP and localhost API URLs. Set backend `ALLOWED_ORIGINS` to comma-separated exact origins for custom frontend domains; Vercel preview origins under `*.vercel.app` are enabled. Do not set the frontend API URL to localhost: visitors' browsers would try to reach their own computers. A production build without this setting reports a configuration error instead of silently calling localhost. The repository has no production deployment URL or credentials, so hosted CORS, cold-start, and judge-flow smoke checks remain unverified.

## Current boundaries

- Human decisions only; Accept/Edit/Dismiss never auto-apply copy.
- Findings require an exact text span and a seeded source ID.
- LLM review is optional and currently a stub; deterministic checks and the saved sample fallback work without it.
- Data resets when the API restarts. A production URL, hosted Supabase project, and persistent audit storage are not configured.
- If analysis reports that it cannot reach the API, check that Window 1 still shows Uvicorn running and retry from the submit screen.
- Offline demo mode uses a saved fixture; it does not run the analysis pipeline and has no measured stage timings.
- The workspace score is a deterministic heuristic, not an accuracy estimate: Compliance starts at 100 and loses 15/7/3 points per open High/Medium/Low finding; Evidence loses 20 for each open ledger match and 7 for another open rule; Tone loses 25 per open tone/slang/banned-term signal; Clarity loses 15 per repeated `!!` and 10 when copy exceeds 180 characters. Overall equals Compliance, capped at 49 when any High finding remains open. The same function drives the ring and exported report.
- Demo role behavior is intentionally a no-login prototype: browser requests send `X-Demo-Role`, and the API uses it to demonstrate reviewer/manager controls. This header is not authentication and must be replaced by authenticated server-side claims before deployment to real users.

## Round 3 plan

1. Facts Ledger expiry alerts and CSV/PDF upload.
2. Guideline Health using dismissal reasons.
3. Evaluation Harness with labelled cases and regression runs.

## Tests and project map

```powershell
npm test
npm run build
npm run typecheck
npm run lint
$env:FRONTEND_URL='http://127.0.0.1:5178'; $env:API_URL='http://127.0.0.1:8011'; npm run e2e
```

- `frontend/` — Vite UI, design tokens, API client, and frontend tests.
- `backend/app/` — FastAPI routes, demo pipeline, fallback fixture, and tests.
- `backend/supabase/` — schema and seed reference; not connected to the running API.
- `scripts/` — deployment verifier, local timing collector, and optional Playwright smoke.
- `docs/` — architecture, decisions, audit notes, screenshots location, and submission package.
- `DEPLOY.md`, `GIT_STEPS.md`, `TASKS.md` — deployment instructions, safe Git steps, and project status.

## Round 2 submission files

See the [submission checklist](docs/submission/ROUND2_SUBMISSION.md), [GitHub upload steps](docs/submission/GITHUB_UPLOAD.md), and updated project PDF at [output/pdf/BrandGate_Round2_Project_Update.pdf](output/pdf/BrandGate_Round2_Project_Update.pdf). The source archive is provided separately for upload. Public app and repository URLs remain placeholders until deployment and repository publication.
