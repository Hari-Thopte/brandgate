# Deployment guide

This is a demo deployment guide. The API currently uses in-memory state; the Supabase schema is included for later integration but the API does not connect to Supabase yet. Do not treat a deployed instance as durable storage.

## 1. Supabase project (schema only for this build)

1. Create a Supabase project in your account and keep the project URL and service role key private.
2. Open **SQL Editor** and run `backend/supabase/schema.sql`. It creates the 16 planned tables, seeds the demo org/rules/terms/ledger, and enables org-claim RLS policies.
3. Confirm the policies and seed rows in **Table Editor**. The app does not yet read/write these tables; no Supabase credentials are needed for the demo API.
4. Never expose `SUPABASE_SERVICE_KEY` to the frontend. Do not set it on the API until Supabase persistence code is implemented and reviewed.

## 2. FastAPI on Render

1. Push a standalone copy of this project to your GitHub account using `GIT_STEPS.md`.
2. In Render, choose **New → Blueprint** and select that repository. The root `render.yaml` defines a Python web service, `/health` check, and `backend/` root.
3. If creating the service manually, set root directory `backend`, build command `pip install -r requirements.txt`, and start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Set `ALLOWED_ORIGINS` to the exact deployed frontend origin, for example `https://your-project.vercel.app`. Vercel preview subdomains are also allowed by the current API CORS pattern; custom domains must be listed explicitly.
5. Leave model keys unset for the deterministic demo. Gemini/Anthropic are not integrated in this build. Keep Supabase service credentials unset until API persistence exists.
6. Deploy and open `https://YOUR-API.onrender.com/health`; expect JSON containing `"status":"ok"`.

## 3. Vite frontend on Vercel

1. Import the same repository into Vercel.
2. Set **Root Directory** to `frontend`, build command to `npm run build`, and output directory to `dist`.
3. Add `VITE_API_URL=https://YOUR-API.onrender.com` in **Production** and **Preview** environment settings. This value is embedded at build time; redeploy after changing it.
4. Deploy and open the assigned `https://YOUR-PROJECT.vercel.app` URL. `frontend/vercel.json` rewrites SPA paths to `index.html`.
5. After deploying, add that exact frontend URL to the Render service's `ALLOWED_ORIGINS` if it is a custom domain; redeploy the API after changes.

## 4. Cold starts and verification

An uptime monitor such as UptimeRobot can GET the API `/health` endpoint every five minutes. This is optional: the frontend also polls health and offers the saved sample result when the API cannot wake. A keep-alive ping is not a substitute for testing the real cold-start path.

After the frontend and API URLs exist, run from the project root:

```powershell
python scripts/verify_deploy.py --frontend-url "https://YOUR-PROJECT.vercel.app" --api-url "https://YOUR-API.onrender.com"
```

This sends the public planted sample to the API, creates an ephemeral in-memory item, checks health/CORS/analyze/grounding/timing, and prints PASS/FAIL with likely fixes. It does not reset shared demo data.

For the browser workflow and screenshots, install Playwright in the project root and its Chromium browser, then run:

```powershell
npm install --save-dev @playwright/test
npx playwright install chromium
$env:FRONTEND_URL="https://YOUR-PROJECT.vercel.app"
$env:API_URL="https://YOUR-API.onrender.com"
npx playwright test --config=playwright.config.mjs
```

The smoke spec saves screenshots to `docs/screenshots/`. It covers the online and blocked-API saved-result flows. Production cold start, second browser, incognito, visual review, and Lighthouse remain manual release checks.
