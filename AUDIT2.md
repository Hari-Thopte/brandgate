# BrandGate second-pass audit

Baseline reproduced at 1220, 1440, 1024, 768 and 390 px in light and dark themes. The 100 baseline images are preserved in `qa/before2/`.

| Issue | Baseline root cause (file + location) | Fix / verification |
|---|---|---|
| N1 | `frontend/src/main.js:317` rendered the guide without any guide CSS; state did not persist collapse. `:402` put it inside normal render flow. | Fixed floating panel, real state steps, persisted close/collapse, footer reopen and `?guide=0`; screenshot + e2e. |
| N2 | `frontend/src/style.css:480` constrained panes to 690px/520px min-height; `main.js:371` put audit below the workspace; actions were inside scrolling detail. | App-shell height, scrollable panes and pinned action footer; audit tab; screenshot + e2e. |
| N3 | `frontend/src/style.css:307-315` assigned conflicting outer and inner grids; `main.js:280` nested timestamps under event details. | One-column timeline rows with non-wrapping right timestamps; tests with empty/3/50 event fixtures. |
| N4 | `frontend/src/style.css:64` applied a single 1200px container; `main.js:202-210` rendered unwrapped nav and role banner. | Route-specific 960/1320 containers and nav inner rail; geometry e2e. |
| N5 | `frontend/src/main.js:303-309` read fields on `{finding,index}` wrappers, unlike workspace score at `:321`; scores had no defined shared formula. | One documented heuristic and deterministic unit coverage; consistent scorecard. |
| N6 | `frontend/src/main.js:232-239` marked sorted-by-copy positions; `:331` grouped list rows by severity while labeling array positions. | Preserve position numbering and state it; verify marker/list/detail index agreement. |
| N7 | `frontend/src/main.js:338` omitted severity class on `.matched-phrase`; CSS `:522` hard-coded high severity red. | Severity-specific token classes and labels; screenshots. |
| N8 | `frontend/src/main.js:235` rendered `<sup>` inline with phrase; CSS `:519` used margins that touched copy. | Fixed superscript gutter spacing and selection ring; wrapping screenshot. |
| N9 | `frontend/src/main.js:204-210` put roles on landing and added a full role banner on app routes; nav layouts diverged. | Separate marketing/app nav behavior and compact role control; screenshots. |
| N10 | `frontend/src/main.js:262,338,340` hid some controls only in UI; `backend/app/main.py:355-391` accepted all role writes without a role guard. | Role header guards on backend write routes plus UI explanations; role-matrix tests. |
| N11 | `frontend/src/main.js:215-216` used a four-line hero and a partial handcrafted sample. | Balanced headline and complete sample using matching exact phrase inventory; screenshot. |
| N12 | `frontend/src/main.js:218-224` built generic text-only story, evidence and human-review sections; `:221` crammed roadmap into footer. | Visual step/evidence/review compositions and tidy footer; screenshot. |
| N13 | `frontend/src/main.js:386-388` explicitly returned a deferred queue screen; API lacked collection endpoint. | Session queue with seeded example rows and searchable/filterable review navigation; e2e. |
| N14 | `frontend/src/main.js:229` emitted two separate footer rows; CSS `:187,611` made analyze sticky on desktop. | Single flex footer row; mobile-only sticky CTA; screenshots. |
| N15 | `frontend/src/main.js:215-229,374-392` used all-caps eyebrow labels throughout and showed the internal round label. | Keep only two product micro-labels; remove internal label; screenshot/text assertion. |
| N16 | `frontend/src/style.css` had 10-11px label declarations in score, finding, audit and source cards; theme overrides used pale low-contrast text. | 12px minimum for captions; contrast script across page/theme combinations. |
| N17 | Existing tests covered routes and offline analysis but not role restrictions, page alignment, revisions, approval, exports and recovery together. | End-to-end workflow suite and captured proof in `qa/after2/`. |

## Assumptions

- Demo role is a request header and is a UX/access-control demonstration, not authentication. The demo API remains ephemeral.
- Queue examples are labelled illustrative seeded data; locally created reviews are kept in browser session storage.
- Score is a deterministic heuristic and not a measured compliance probability or model accuracy.

## Phase and verification report

### Phase A — functional fixes

- Review is an app-shell with independently scrolling panes, a pinned decision bar, and an Audit tab; audit events no longer sit below the review page.
- Audit rows use a readable timeline rail with a fixed-width, right-aligned timestamp. Empty, three-event and 50-event states are covered.
- Page rails use the read/app widths. Playwright checks logo/content alignment at desktop and mobile breakpoints.
- The score is deterministic: `max(0, 100 - 15×open-high - 7×open-medium - 3×open-low)`; each category score is derived from the same open finding set. It is explicitly labelled heuristic.
- Finding numbers follow source-copy order, independent of severity grouping. The text marker, list row and detail pane share the finding index.
- Matched phrases and markers use severity-specific styles and accessible labels; superscript marks have clearance from the copy.
- Landing and app navigation are distinct. Demo roles are visible in the app navigation and the “Viewing as” strip is removed.
- Reviewer-only review writes are checked in the UI and API. Creator/Manager write attempts are tested as forbidden; Manager Hub edits are allowed.
- Start editor footer stays in one row at desktop widths; its mobile action adapts to a full-width control.
- E2E covers logo navigation and scroll reset, sample → analyze → review decisions → approval, revision v3/reanalysis, exports, saved offline review and live retry recovery.

### Phase B — product polish

- Landing now has a three-line headline, full sample phrase inventory, four-step story, evidence pairs, contextual reviewer actions, a tidy footer and the dark closing CTA.
- The session Queue is searchable/filterable and opens reviews; Hub Health is present and the Manager can edit guideline rows. Seeded examples are illustrative.
- Internal round labels and excess all-caps labels were removed. Captions meet the 12px floor and both local display/UI fonts load.
- Final visual review exposed card-preview overlap and footer collisions; CSS was adjusted and the final captures were regenerated.
- Final 390px dark-mode inspection found an offline-banner wrap issue and a clipped score label; both now wrap into explicit mobile rows. The final screenshot matrix was regenerated after these fixes.

### Phase C — proof

- `qa/before2/`: 100 original PNG screenshots across 10 routes × five widths × two themes, plus metadata/error output. Hub Health was added during this pass, so it has no pre-change route capture.
- `qa/after2/`: 110 final PNG screenshots across 11 routes × five widths (1220, 1440, 1024, 768, 390) × light/dark; `browser-errors.json` is empty. Capture metadata is in `qa/after2/capture-meta.json`.
- Direct 1220px light-theme comparison points (other widths/themes follow the same `<page>-<width>-<theme>.png` naming):

| Page | Before | After |
|---|---|---|
| Landing | `qa/before2/landing-1220-light.png` | `qa/after2/landing-1220-light.png` |
| Start | `qa/before2/start-1220-light.png` | `qa/after2/start-1220-light.png` |
| Workspace | `qa/before2/workspace-1220-light.png` | `qa/after2/workspace-1220-light.png` |
| Audit | `qa/before2/audit-1220-light.png` | `qa/after2/audit-1220-light.png` |
| Queue | `qa/before2/queue-1220-light.png` | `qa/after2/queue-1220-light.png` |
| Brand Hub — Guidelines | `qa/before2/hub-guidelines-1220-light.png` | `qa/after2/hub-guidelines-1220-light.png` |
| Brand Hub — Terms | `qa/before2/hub-terms-1220-light.png` | `qa/after2/hub-terms-1220-light.png` |
| Brand Hub — Ledger | `qa/before2/hub-ledger-1220-light.png` | `qa/after2/hub-ledger-1220-light.png` |
| AI & Privacy | `qa/before2/privacy-1220-light.png` | `qa/after2/privacy-1220-light.png` |
| Not found | `qa/before2/not-found-1220-light.png` | `qa/after2/not-found-1220-light.png` |
| Brand Hub — Health | No baseline route | `qa/after2/hub-health-1220-light.png` |
- Final automated contrast audit checked 102/56/129/27 visible text nodes for Landing/Start/Workspace/Audit respectively in both themes; zero pairs below 4.5:1. Instrument Sans and Fraunces load in all eight page/theme combinations. Evidence: `qa/after2/contrast-audit.json`.
- Frontend: typecheck syntax pass (18 JS files; no TypeScript checker exists in this Vite/JavaScript repo), lint pass, 20/20 unit tests, production build pass.
- Backend: Python compile pass, pytest 9/9 pass (one upstream Starlette/AnyIO deprecation warning).
- Playwright: 9/9 E2E tests pass, including live API, offline fallback/recovery and 1220/390 layout checks.
- Preview retained at `http://127.0.0.1:5181/`.

### N1–N17 proof map

| Issue | Proving evidence |
|---|---|
| N1 | `smoke_live.spec.mjs` judge-guide visibility/clearance test; Start/Workspace captures at `qa/after2/`. |
| N2 | Live judge-flow E2E, viewport-fit E2E; workspace and mobile captures. |
| N3 | Audit timeline E2E with 0, 3 and 50 events; audit captures. |
| N4 | Review route rail alignment E2E; screenshot matrix across all 11 routes and widths. |
| N5 | `reviewScore.test.js` deterministic and open-risk tests; workspace scorecard screenshot. |
| N6 | `findingOrder.test.js` plus live marker/list/detail interaction in judge-flow E2E. |
| N7 | Severity-specific DOM classes/labels; workspace light/dark captures. |
| N8 | Source-ordered phrase marks and screenshot wrapping checks at 390/768/1024/1220/1440. |
| N9 | Logo/navigation E2E and landing/app screenshot captures. |
| N10 | Backend role matrix in `backend/app/tests/test_pipeline.py`; Manager Hub and role restrictions E2E. |
| N11 | Three-line hero and complete planted-sample screenshot; live judge-flow E2E. |
| N12 | Landing story/evidence/reviewer sections in light/dark captures. |
| N13 | Manager Hub/Queue E2E verifies seeded rows, filters and open action. |
| N14 | Start desktop screenshot plus mobile start/upload E2E. |
| N15 | Landing/Hub/privacy screenshots and source copy check; internal Round 2 label removed. |
| N16 | Contrast report: zero failures in all eight page/theme combinations; font-load flags true. |
| N17 | Full Playwright live flow plus offline fallback and Retry live recovery test. |

## Limits still to resolve before production

- Roles are demo request-header guards, not authentication or a substitute for a production identity/authorization system.
- API storage/queue/audit are in-memory and ephemeral; browser fallback state is local to that browser. Supabase, RLS and cross-org isolation are not provisioned here.
- No live LLM provider is configured; the demo's grounded deterministic/fallback path is what was verified.
- Public deployment, external cold-start behavior, and production CORS/domain configuration remain unverified. Local tests ran on Python 3.13, not the specified Python 3.11; Ruff is not installed.
- Revisions and diffs are review previews; nothing is automatically applied to the original manuscript.
