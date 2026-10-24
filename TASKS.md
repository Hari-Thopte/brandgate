# Round 2 tasks

## Phase 0 — Setup & decisions
- [x] Create repo folders, `.env.example`, README
- [x] Create Supabase schema and demo seed (live project provisioning unavailable)
- [x] Record ledger-before-LLM order in architecture and ADR
- [ ] Deploy FastAPI `/health` and frontend skeleton (hosting credentials unavailable)
- [ ] Add hosted keep-alive ping and verify cold start (deployment pending)
- [x] Add Render Blueprint, Vercel SPA rewrite, Python runtime pin and exact deploy steps (`DEPLOY.md`)
- [x] Isolate project-owned paths and provide safe standalone Git instructions (`docs/PROJECT_FILES.md`, `GIT_STEPS.md`)

## Phase 1 — Vertical slice
- [x] Seed demo rules, terms and ledger entries
- [x] Implement ingest, sanitize and deterministic checks
- [x] Implement rule retrieval and ledger matching
- [ ] Configure grounded LLM provider (deterministic-only fallback is active)
- [x] Grounding validator and merge/scoring
- [x] Items, analyze, analysis progress, findings decisions, status, comments, audit endpoints
- [x] SHA-256 cache and stored sample fallback
- [x] Landing, role switcher, sample ad, review workspace and approval/audit UI
- [x] Accept/Edit/Dismiss with reason and audit trail
- [ ] Persist to Supabase and run hosted demo (requires project credentials)
- [x] Add deployment verifier for health, CORS, frontend, grounded sample and response timing
- [x] Add and run Playwright live/offline judge smoke script; current workflow passes 5/5
- [x] Add a searchable Ctrl/Cmd+K quick-navigation palette and copyable redacted diagnostics

## Phase 2 — Reliability
- [ ] Add full test suite and abuse limits
- [ ] Cross-org isolation verification against Supabase
- [ ] Record measured production timings
- [x] Measure 20 local sample cache misses and 20 hits; record caveat that artificial stage delays dominate
- [x] Disable Analyze for empty copy and explain/retry when the local API is unavailable
- [x] Add API timeout/retry and a usable, labeled offline sample review fallback
- [x] Verify online and offline sample review flows in the local browser through Approved and audit
- [x] Record P0 local browser walkthrough results and production limitations (`docs/p0-browser-audit.md`)
- [ ] Run production URL smoke, cold-start, incognito and second-browser checks (awaiting deployment URL)

## Phase 3 — Remaining must-haves
- [x] Brand Hub (read-only)
- [x] AI & Privacy
- [ ] Dashboard queue

## Local review UX upgrade (2026-10-23)
- [x] Add workspace score ring, open severity counts, decision progress and approval gate
- [x] Add Original / Revised / Diff preview; accepted suggestions appear only in the preview and never overwrite original copy
- [x] Add insight cards, confidence meters, suggestion text and source evidence dialog
- [x] Replace cramped audit grid with a readable vertical event timeline and human-readable finding spans
- [x] Add three selectable sample ads, review checklist, Brand Hub search and data counts
- [x] Add role context with Creator read-only findings and Reviewer decision controls
- [x] Add audit filters and Markdown / JSON / print report actions
- [x] Add static landing story sections and trust cues
- [x] Defer the dashboard queue per PRD; keep the landing demo static and respect the approved motion limits
- [ ] Add audit grouping/expand details, source expiry badges after verified metadata is available, and inline finding popovers
- [ ] Consider keyboard navigation, undo toasts and an expanded motion pass only after matching the original DESIGN rules
- [ ] Production smoke, cold-start, incognito and second-browser validation still require a deployment URL
- [ ] Production UX smoke remains pending a deployment URL

## Visual redesign (2026-10-23)
- [x] Add semantic design tokens and refine typography, contrast, surfaces, and spacing
- [x] Improve landing hierarchy and add an in-page “See how it works” action
- [x] Remove dark theme toggle to keep the Round 2 interface light-only
- [x] Add responsive layouts and stronger focus/hover states without changing app flow
- [x] Verify local desktop screens and existing frontend/backend checks
- [ ] Emulate 360px, 768px, 1280px, and 1920px viewports and capture screenshots

## Final build prompt follow-up (2026-10-24)
- [x] Diagnose likely production fetch failure: production API URL is missing and frontend fell back to localhost
- [x] Prevent production builds from silently targeting localhost; document `VITE_API_URL` deployment setup
- [x] Add layered, static app background and judge guide checklist with local dismissal preference
- [x] Add workspace Next step action and deterministic, findings-grounded risk summary
- [ ] Verify hosted URL, CORS, cold start, and full judge flow (no deployment URL/credentials configured)
- [ ] Verify 360 / 768 / 1280 / 1920 viewport screenshots and keyboard-only guide flow

## Final build prompt and add-on continuation (2026-10-24)
- [x] Tighten production API URL validation (HTTPS only; reject localhost and malformed URLs)
- [x] Configure exact backend CORS origins plus Vercel preview origin pattern
- [x] Add generic exception response, 64 KB request cap and lightweight per-client request limit
- [x] Include total stage count in analysis progress records; add preflight and request-cap tests
- [x] Add eight-step pipeline visualizer and explicitly labeled heuristic quality indicators
- [x] Add source evidence explanation with exact span and grounding confirmation
- [x] Add draft autosave/recovery and J/K/A/D/E, Ctrl/Cmd+K, ?, and Esc shortcuts
- [x] Add static layered background, SVG logomark/favicon, social metadata and demo script
- [ ] Configure hosted deployment and pass production smoke/cold-start/incognito checks (requires URL and credentials)
- [ ] Capture the requested 1100, 1280 and 1920 widths (final responsive matrix covers 1220, 1440, 1024, 768 and 390)
- [x] Add all-light A/B/C theme query modes and preview links; visual contact sheet and final screenshot-based choice remain pending
- [x] Approval confirmation checklist added; undo actions and remaining P2 tools deferred pending scope and visual review
- [x] Add an approval confirmation sheet with decision checklist before status change

## Deployment package and submission prep (2026-10-24)
- [x] Add Round 3 plan with goal, value, design, model, metrics, risks, effort and eval format
- [x] Add completed features, implementation/limitations, Round 1 changes, Round 3 summary, PDF outline and 90/60 second demo script
- [x] Add live deployment verifier and local 20+20 timing collector
- [x] Add Playwright online/offline approval smoke and screenshot output locations
- [x] Add Google Clean / Apple Soft / Mist Gradient themes via `?theme=a|b|c`; default C landing and A workspace
- [x] Add command palette and safe copy-diagnostics action
- [x] Capture and visually inspect the final screenshot set (100 images across ten routes, five widths and two themes)
- [ ] Hosted deployment, hosted smoke, cold-start, incognito/second-browser and Lighthouse (no URLs or account credentials supplied)
- [ ] Round 3 P2 extras: version compare, manual findings, smart-fix batch apply/undo, resizable panes, notifications, read-only share link, and session dashboard

## Routing, resilience and review handoff (2026-10-24)
- [x] Add URL routes for landing, submit, review, audit, queue stub, Brand Hub tabs, privacy and not-found
- [x] Add back/forward navigation, review hydration, route titles and Vercel SPA fallback
- [x] Bundle demo guidelines, terms, ledger and sample ads so Brand Hub and samples render without API access
- [x] Add a 7.5-second readiness window followed by deterministic local review for sample and pasted copy
- [x] Persist local fallback review state and human decisions across page reloads in the same browser
- [x] Add local and API audit hash-chain verification, request IDs, readiness endpoint and item retrieval endpoints
- [x] Add tests for deep-link routing, local deterministic exact spans/sources and audit-chain integrity; frontend 13/13 pass
- [x] Compile backend and run isolated backend tests; 4 pass
- [x] Full backend endpoint test suite runs (7 passed) when executed with host permissions; sandboxed TestClient requests cannot reach loopback
- [x] Local preview responds on port 5174; browser accessibility inspection confirms Landing, Submit, Brand Hub and AI & Privacy routes
- [ ] Playwright console/network smoke and 1440 px screenshots (Playwright is not installed)
- [ ] Hosted deployment, backend cold start, production browser walkthrough and self-hosted Inter font
- [ ] Round 2 queue remains a clearly labeled deferred route per PRD scope



## Combined fix and visible UI follow-up (2026-10-24)
- [x] Remove old scattered CSS hex colors outside the semantic token file; apply Google Clean light tokens and blue as the only accent
- [x] Restore full-bleed landing hero, remove landing role chrome/green eyebrow dot, and show four workflow steps
- [x] Raise CSS font-size declarations below 13 px to the 13 px minimum
- [x] Add backend pytest path configuration; `python -m pytest -q` passes all 7 tests
- [x] Confirm local sample API flow, CORS preflight, Approved status and audit-chain verification
- [ ] Capture 1440 px screenshots and Playwright console/network report (Playwright unavailable)
- [ ] Load and verify self-hosted Inter Variable (no font package/file is present)
# Phase 3–6 checklist (2026-10-25)

## Phase 3 — Review workspace
- [x] Replace the crowded finding stack with independently scrolling findings, manuscript, and finding-detail panes.
- [x] Add labeled decision counts, selection/highlight synchronization, source notes, editable suggestions, real word diff, audit and approval panel.
- [x] Add mobile Findings / Ad copy / Detail tabs and an action bar.
- [x] Fix J/K to navigate actual open finding indices and A/D/E to operate on the selected finding.
- [x] Playwright online and offline sample approval flows pass.

## Phase 4 — Start a review
- [x] Add five copy samples and real bundled guideline count.
- [x] Add growing editor, live word/character count, `.txt`/`.md` import, sticky Analyze action and Ctrl/Cmd+Enter.
- [x] Keep the demo-storage disclosure visible under the editor.

## Phase 5 — Landing
- [x] Replace the old static preview with an interactive marked-up sample ad.
- [x] Add evidence source comparison, human decision explanation, honest AI/privacy copy, CTA, README and Brand Hub links.
- [x] Remove fabricated public metrics and testimonial/logo content.

## Phase 6 — Polish and proof
- [x] Add persisted system-aware Light/Dark theme.
- [x] Add restrained motion and reduced-motion override.
- [x] Add contrast audit for Landing, Start, Workspace and Audit in both themes.
- [x] Complete Playwright online/offline, mobile, sample upload, theme and route checks.
- [ ] Run a public deployment smoke test (requires a deployed URL and host credentials).

## Final verification note (2026-10-25)
- [x] `npm test` passes 16/16, `npm run build`, `npm run typecheck`, and `npm run lint` pass.
- [x] Playwright passes 5/5 on the local live preview; final origin `127.0.0.1:5180` is allowed by the API CORS configuration.
- [x] `qa/after-final/` contains 100 screenshots; `browser-errors.json` is empty.
- [x] Contrast audit checks Landing, Start, Workspace and Audit in light and dark themes; 0 failures, both local fonts loaded.
- [x] Five isolated backend checks and Python compile pass.
- [x] Full backend pytest passes 8/8 when run with host permissions; the sandboxed TestClient run stalls. Ruff is not installed in the active Python environment. Hosted deployment and cold-start verification still require a URL and host credentials.

## Round 2 submission artifacts (2026-10-25)
- [x] Create updated 10-slide project PDF and editable PPTX with visible URL placeholders
- [x] Add completed-features, tech, Round 1 changes, and three Round 3 improvements to the submission checklist
- [x] Add Windows GitHub upload and local run instructions
- [ ] Replace app/repository placeholders after public deployment and GitHub push

