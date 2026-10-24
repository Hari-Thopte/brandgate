# BrandGate Repository Audit

Audit date: 2026-10-24. This captures the repository and browser state before the requested stabilization and redesign work. Pre-change Playwright screenshots are in `qa/before/`; 40 route/viewport captures were taken at 1220, 1440, 768 and 390 px.

## Repository and stack

- Frontend: Vite 8 + browser-native JavaScript modules, not React, TypeScript or Tailwind. Entry: `frontend/index.html` → `frontend/src/main.js`; styles are split across `style.css`, `upgrade.css`, `modal.css`, `premium.css`, `tokens.css`, and `visual-fixes.css`.
- Backend: FastAPI + Pydantic in `backend/app/main.py`; in-memory item/analysis/audit/cache dictionaries. The SQL file under `backend/supabase/schema.sql` is a schema reference and is not connected to runtime requests.
- Model review: not configured or connected. Deterministic checks and committed fixtures work; this limitation is disclosed in the Privacy page and README.
- Persistence: browser `localStorage` for the saved review and draft; server in-memory stores for live API state. Offline fallback decisions/audit events remain browser-local.
- There is no root `package.json`, Vite proxy configuration, TypeScript config, Tailwind config, or lint/typecheck script. `frontend/package.json` runs only Vite and Node's test runner. `npm run dev` currently starts only the frontend.
- Project docs `docs/prd.md`, `docs/design.md`, and `docs/tech.md` are absent. The supplied Round 2 PRD and architecture prompt remain the product constraints; `docs/memory.md` records implementation decisions and limitations.

## Routes and page rendering

| Route | Rendered view | Source |
|---|---|---|
| `/` | Landing, unless `state.item` is still set, in which case it renders the workspace | `frontend/src/lib/routes.js:1-2`; `frontend/src/main.js:345-346` |
| `/start` | Submit editor and sample picker | `frontend/src/lib/routes.js:3`; `frontend/src/main.js:225-226` |
| `/review/:id` | Review workspace, hydrated from API or saved browser state | `frontend/src/lib/routes.js:8-12`; `frontend/src/main.js:60-82,302-316` |
| `/review/:id/audit` | Review audit timeline | `frontend/src/lib/routes.js:8-12`; `frontend/src/main.js:323-327` |
| `/hub` | Redirect to `/hub/guidelines` | `frontend/src/lib/routes.js:6` |
| `/hub/guidelines`, `/hub/terms`, `/hub/ledger` | Read-only Brand Hub tabs | `frontend/src/main.js:317-322,486-494` |
| `/privacy` | AI & Privacy explainer | `frontend/src/main.js:333-343` |
| `/queue` | Deferral/placeholder screen; no queue implementation | `frontend/src/main.js:329-331` |
| Other paths | 404 screen | `frontend/src/lib/routes.js:13`; `frontend/src/main.js:332` |

The navigation, role banner, and command palette are generated in `frontend/src/main.js:186-193,335-360,407-468`. The app is a single-file-rendered browser application with delegated events rather than a component framework.

## API endpoints

Defined in `backend/app/main.py`:

| Method/path | Purpose |
|---|---|
| `GET /health`, `GET /health/ready` | Liveness and in-memory demo readiness (`243-254`) |
| `POST /demo/reset` | Clear demo stores (`256-262`) |
| `POST /items`, `GET /items/{item_id}`, `GET /items/{item_id}/analysis` | Create/read review and latest analysis (`264-292`) |
| `POST /items/{item_id}/analyze`, `GET /analyses/{analysis_id}` | Queue background analysis and poll real stage/findings/timings (`294-324`) |
| `POST /findings/{finding_id}/accept`, `/edit`, `/dismiss` | Record human decisions; dismissal has a required Pydantic reason (`326-345`) |
| `POST /items/{item_id}/comments`, `POST /items/{item_id}/status` | Audit comments and status transitions; approval checks open findings (`347-365`) |
| `GET /items/{item_id}/audit`, `/audit/verify` | Fetch and verify audit chain (`367-392`) |
| `GET /brand/guidelines`, `/brand/terms`, `/brand/ledger` | Read seeded demo brand data (`394-411`) |

There are no runtime endpoints for Hub edits, assets, expiry health, PDF export, role enforcement, or persistent database storage. The API uses a fixed demo organization and in-memory demo data. The UI's API helper is in `frontend/src/main.js:101-129`; URL validation is in `frontend/src/lib/apiConfig.js`.

## State and data flow

1. `routeFor()` maps `location.pathname` to a view. `navigate()` writes browser history, updates state, scrolls, renders, and starts route hydration where needed (`main.js:27-47`).
2. Brand Hub data starts from bundled JSON (`frontend/src/data/demo/*.json`) and is replaced with API data on success; any failure silently restores bundled values (`main.js:486-494`).
3. Submit stores draft/copy in component state and `localStorage`. Analysis waits up to 7.5 seconds for `GET /health/ready`; then it `POST`s an item, `POST`s an analysis, polls `GET /analyses/{id}`, and records `In review` (`main.js:362-392`).
4. A readiness/network failure runs local deterministic checks. The exact planted ad uses the stored six-finding fallback; actions/audit are kept in local maps/localStorage and marked offline (`main.js:131-184,394-405`).
5. Findings are rendered all at once in the right pane (`main.js:246-251,315`). Accept/edit/dismiss/comment/status actions call API routes and refresh findings/audit; offline actions use the local adapter (`main.js:407-468`).
6. API analysis has eight measured stages and a SHA-256 content cache; source/span validation and sample fallback are in backend pipeline helpers (`backend/app/main.py:35-104,170-241`). Model review is unavailable by design in this runtime.

## Bug report root causes and pre-change evidence

| ID | Root cause (file/line) | Pre-change status/evidence |
|---|---|---|
| B1 Landing preview clipping | `.preview-window` is fixed-height and clipped (`frontend/src/style.css:1`, `frontend/src/upgrade.css:17`, `frontend/src/visual-fixes.css:66`); the status list and caption are children of this fixed card (`frontend/src/main.js:207-212`). The card remains a static illustrative mock rather than a live annotation component. | The `/` captures in `qa/before/` show incomplete vertical content and no interaction. |
| B2 Wordmark does not always return to landing | Wordmark emits `data-route="/"` (`frontend/src/main.js:188-189`), but the home render branch selects `workspace()` whenever `state.item` remains set (`main.js:345-346`). `routeForPage('home')` also returns the workspace URL when an item exists (`main.js:89-96`). | Code-path reproduction; navigation must clear session view state without deleting persisted review data. |
| B3 Scroll restoration/navigation | `navigate()` scrolls immediately to top, while `popstate` restores a `scrollY` value captured by a global `replaceState` handler (`main.js:34-47`). There is no per-entry save/restore or hash-aware routing; intermediate rerenders and the post-analysis route change can reset position. | Requires route-history E2E coverage; pre-change page captures establish viewport layout. |
| B4 Palette scrim and keyboard UX | `.modal-backdrop` uses saturated `var(--primary)` and a saturated shadow (`frontend/src/modal.css:1-2`). Palette rows have no grouping, icons or key hints (`frontend/src/main.js:338-339`); keyboard handling only supports open/close, not focus trap or arrow/Enter navigation (`main.js:474-484`). | `qa/before/*` includes palette only if opened; keyboard behavior is code-path defect. |
| B5 Live API silently falls back | FastAPI CORS allowlist has ports 5173/5174 but not current frontend origin 5177 (`backend/app/main.py:72-82`). In-browser preflight at `http://127.0.0.1:5177` is rejected; confirmed by 40-page Playwright capture console logs. The client retries every method once with a 20-second timeout (`main.js:106-129`), readiness then polls for 7.5 seconds (`main.js:362-370`) and converts errors into local fallback (`main.js:394-405`). There is no shared typed client or measured connection state. `/health/ready` exists, but `/ready` does not; readiness reports the model unavailable. | Confirmed live cause: Playwright logs “No `Access-Control-Allow-Origin` header” for `/brand/*` requests from port 5177. `qa/before/browser-errors.json` has the full capture log. |
| B6 Workspace white void | Three-column `.panes` layout has `min-height:620px` (`frontend/src/style.css:1`); right `.findings-scroll` is independently capped at 480px (`style.css:1`), while center `.ad-content.paper` has a 310px minimum and findings are long (`frontend/src/upgrade.css:99,106`). The overall page scrolls instead of keeping coordinated viewport-height panes. | `qa/before/workspace-*` show page-level scrolling and unequal content lengths. |
| B7 Sticky bars cover content | Nav is sticky (`style.css:1`); `.summary-bar` is sticky at 76px and `.left-pane` at 168px (`frontend/src/upgrade.css:75,96`). There are multiple sticky layers with independently chosen offsets; target headings/findings do not consistently reserve that stack. | Reproduced by scrolling the workspace and following finding anchors. |
| B8 Inconsistent content widths | Landing uses a 1200px rail (`tokens.css:69-71`); submit is 1120px (`upgrade.css:54`); workspace is 1600px (`upgrade.css:73`); simple pages are 820px (`style.css:1`); role banner is 1120px (`upgrade.css:7`); nav uses a separate calc padding (`style.css:1`). | Width mismatch is visible in all `qa/before/*-{width}.png` route captures. |
| B9 Unlabelled score/step chips | Workspace renders `compact-steps` as four circles containing only status ticks/numbers (`frontend/src/main.js:315`); the current state is not expressed as accepted/edited/dismissed/open counts. | Visible in workspace captures. |
| B10 Broken tick marks | Trust row and submit checklist use typed Unicode checks (`frontend/src/main.js:203,226`); no consistent icon component is used, and decorative glyphs in other views are likewise typed characters. | Visible in landing/start screenshots; no icon font/SVG validation exists. |
| B11 Start editor/footer | Textarea has fixed 320px height (`frontend/src/upgrade.css:56`), while the editor shows only “Ready to analyze” and the submit footer sits outside the card (`main.js:226`, `upgrade.css:56-67`). At narrow widths, the disclaimer can exceed the viewport because layouts are primarily desktop-first. | `qa/before/start-*` captures show blank textarea area and cramped footer/disclaimer at 390/768. |
| B12 Finding overload | `findingCard()` puts category, severity, confidence, message, suggestion, source, and three actions in every card (`frontend/src/main.js:246-251`); workspace maps every open finding into one scrolling pane (`main.js:315`). There is no selected-finding detail model. | Visible in workspace screenshot: repeated action rows and six tall findings. |
| B13 Naming/title mismatch | Static HTML title/meta/OG title say “Brand Compliance Copilot”/“Brand Review” (`frontend/index.html:6-10`); render assigns route-specific names plus “Brand Review” (`frontend/src/main.js:350-354`). There is no single product-name constant or dynamic OG title. | Confirmed from markup and `document.title` route logic. |

## Additional same-class findings

- Vite has no proxy; the local dev API is hard-coded by `getApiBaseUrl()` to `127.0.0.1:8000` when unset. The CORS issue is therefore reproduced rather than a backend-port mismatch.
- Error paths are swallowed in `hydrateReviewRoute()` and `loadBrandData()`; both catch without preserving request ID/status or distinguishing CORS, validation, server, and timeout (`main.js:60-82,486-494`).
- Fallback recovery has a retry action, but it navigates back to `/start` and launches `analyze()` without awaiting it (`main.js:440`); it does not preserve a clear per-request recovery state.
- Fixed-height/overflow patterns also appear in the findings pane and modal command list; the latter is bounded intentionally for internal scrolling, but the main review pane's 480px cap contributes to the workspace imbalance.
- The current theme is always forced to light during render (`main.js:345-347`). The prior query-theme styles are not a persisted accessible theme system.
- `qa/before/browser-errors.json` records repeated CORS failures at all four viewport sizes; no other Playwright page errors were recorded.

## Scope notes

The focused prompt prioritizes live API reliability, review workspace, and a copy-desk redesign. The older Round 2 PRD supplied earlier excludes dark mode, queue implementation, uploads, and Hub editing. Those features remain deferred unless the active build plan explicitly reaches the scope-guarded post-Phase-6 extension. The current repo is a Vite prototype, so the audit does not assume React/TypeScript/Tailwind or connected Supabase/model credentials.

## Phase 1 verification and fixes (2026-10-25)

- Confirmed the live browser origin in the preview was `http://127.0.0.1:5177`; the CORS allowlist did not include 5177. Added localhost and loopback origins for both 5177 and 5178. This directly fixes the reported preview preflight failure; Playwright/API preflight is checked on 5178 because 5177 is occupied by an existing process outside the project.
- Added `/ready` as an alias for `/health/ready`, preserved existing routes, added `llm_key_present`, and changed the FastAPI title to BrandGate. The runtime remains an in-memory prototype and has no model provider implementation; readiness does not claim otherwise.
- Added `frontend/src/lib/api.js`: 10-second timeout, request IDs, elapsed time, a 4-second waking state, three attempts for GET only, one attempt for writes, structured HTTP errors, and JSON response validation. 422 errors surface as client errors; they do not trigger the offline fixture.
- Added the global live/waking/offline connection indicator, initial readiness probe, diagnostics copy toast, and Retry live action. Retry clears the offline item and starts the existing live submission path. After network failures exhaust GET retries, the app enters its explicitly labeled browser-local fallback.
- `/` now always renders landing; the BrandGate wordmark points to `/`. Navigation saves per-entry scroll history, resets on route changes, restores in-app back position, and preserves hashes. `/start` Back returns to internal history where available, otherwise landing.
- Page titles now use `Page · BrandGate`; landing is `BrandGate`. Added root scripts for one-command startup, JavaScript syntax and lint checks, plus Playwright command wiring. TypeScript is not present in the detected Vite codebase; `typecheck` is transparently a JavaScript syntax check, not a static type checker.
- Pre-change captures: `qa/before/` (50 files, widths 1220/1440/1024/768/390); Phase 1 captures: `qa/after-phase1/` (50 files, same routes and widths; browser error list empty). Visual redesign has not started at this phase.
- Tests: frontend 16/16; JavaScript syntax check 15 files; lint check passed; Vite production build passed; backend compile passed and four isolated backend tests passed. Full pytest still hangs in the existing TestClient HTTP scenarios. Playwright logo/scroll/live API/offline recovery/palette checks pass. The long approval walkthrough test still needs a rerun after fixing its stale Hub navigation locator.

## Phase 2 design system (2026-10-25)

- Replaced the previous layered CSS files with one `frontend/src/style.css` and removed the old `upgrade.css`, `modal.css`, `premium.css`, `tokens.css`, and `visual-fixes.css` imports/files. The foundation now uses warm paper/surface/sunken tokens, ink actions, pen/highlighter/citation colors, 4–8px radii, hairline borders, aligned 1200px rails, and no gradients or glass blur.
- Self-hosted Fraunces, Instrument Sans, and JetBrains Mono through Fontsource packages and Vite. Landing preview is a content-sized three-column annotated review mock; full-bleed stats/bands and asymmetric editorial sections replace the prior centered blue-wash hero.
- Reworked visible type hierarchy, panels, tabs, forms, navigation and palette scrim. Added a narrow-screen nav grid and kept the skip link visually hidden until keyboard focus.
- Captures: `qa/after-phase2/` contains 50 route/viewport images at 1220/1440/1024/768/390 with no Playwright page, console, or request errors. Screenshot inspection of the landing confirms a visibly different warm-paper/editorial layout; the old review layout still needs the Phase 3 master-detail rebuild.
- Validation: frontend 16/16, build, JS syntax/lint checks pass. Dark theme, details workspace, full keyboard palette and reduced-motion polish remain in later phases.

## Phase 3 — Review workspace (2026-10-25)

- Replaced the repeated finding cards with a master/detail workspace: severity-grouped finding list, paper manuscript with numbered spans, one selected finding detail, source evidence, editable suggested revision, labeled decision counts and approval controls. The status summary is the only sticky workspace row; navigation is non-sticky there.
- The All-decided state exposes the approval control, accepted/edit/dismiss actions are audit-logged, and the mobile view switches among Findings, Ad copy and Detail with a bottom action bar.
- Keyboard J/K now iterates `{finding,index}` records, not undefined `.index` properties on findings; A/D/E target the current detail. The e2e helper waits for each live count update before acting on the next finding.
- Playwright walkthrough covers live analyze → six finding decisions (including a required dismissal reason) → Approved → Brand Hub → Privacy. Online and offline sample walkthroughs pass. Screens are at `qa/after-phase3/`; `browser-errors.json` has no browser errors.

## Phase 4 — Start (2026-10-25)

- Added five sample ads, live character/word counts, dynamically derived guideline count, an expanding text editor, `.txt`/`.md` import capped at 12 KB, and Ctrl/Cmd+Enter analyze shortcut. The editor footer remains visible and the storage disclaimer is in normal document flow.
- Browser verification confirms text import and keyboard analysis navigate to the review route. Captures are in `qa/after-phase4/` across 1220/1440/1024/768/390 widths; `browser-errors.json` has no failures.

## Phase 5 — Landing (2026-10-25)

- Replaced the static mock card with selectable highlighted copy and two source-linked finding rows; each opens the same planted BrightDay sample in Start.
- Added evidence ledger comparison, explicit human-decision explanation, accurate AI/data-storage copy, closing CTA, Privacy/README/Brand Hub links and team label. Removed marketing metrics not needed to describe actual product behavior.

## Phase 6 — Polish and proof (2026-10-25)

- Added a persisted OS-default Light/Dark toggle and reduced-motion overrides. Self-hosted Instrument Sans and Fraunces load; JetBrains Mono is also packaged.
- Updated contrast audit to load each theme before app initialization. It checks Landing, Start, Workspace and Audit: light 0 failures; dark 0 failures. Font checks pass for Instrument Sans and Fraunces.
- Full local Playwright suite passes 5/5: route/logo/scroll, live end-to-end approval, offline fallback approval, palette, and mobile/upload/theme flow. Frontend unit suite 16/16, build, syntax and lint pass.
- Local screenshot captures are not a substitute for an externally hosted production check. No public URL, cloud database or model credentials are configured.

## Final verification addendum (2026-10-25)

- The Phase 3–6 work is complete locally. `qa/after-final/` contains 100 screenshots (ten routes × five viewport widths × light/dark) and `browser-errors.json` contains no errors. The contrast audit reports zero failures on Landing, Start, Workspace, and Audit in both themes; Instrument Sans and Fraunces load successfully.
- Playwright passes all five scenarios on the live local sample, including six decisions, approval and audit, browser-local offline approval, keyboard palette, `.txt` import, and mobile panes. Frontend tests pass 16/16; production build, JS syntax check, lint, Python compile and full backend pytest (8/8 with host permissions) pass.
- Adding 5179 and 5180 loopback origins fixes local CORS when Vite must move beyond occupied ports. CORS preflight was verified on the final local origin `http://127.0.0.1:5180`. The launcher no longer uses Uvicorn autoreload because Windows child-process reload terminated the paired preview during verification.
- Full backend pytest passes 8/8 with host permissions; the sandboxed TestClient run stalls at `test_health_and_vercel_preflight`. `python -m ruff` cannot run because Ruff is not installed in this environment. No public deployment URL or hosting credentials were supplied, so hosted smoke, cold start, and durable Supabase/LLM behavior are not verified or available.
