# Project file inventory

`BrandComplianceCopilot/` is the self-contained BrandGate project. The parent `PROJECT/` directory holds unrelated apps and decks; do not include those paths in BrandGate commits.

## Owned layout

- `README.md`, `TASKS.md`, `DEMO_SCRIPT.md`, `.gitignore`, `.env.example`: overview, work status, demo path, ignore rules and backend env names.
- `frontend/`: Vite app (`index.html`, `src/`), frontend env template, package manifest, and Node tests.
- `backend/`: FastAPI app, tests, pinned requirements, Python version file, and Supabase schema/seed.
- `docs/`: architecture, memory, ADR, local browser audit, deployment and submission material.
- `scripts/`: deployment verifier and live browser smoke test.

Generated `frontend/node_modules`, `frontend/dist`, Python caches, local `.env` files, and test reports are not source deliverables. The existing project files have been retained; nothing from sibling projects was copied or deleted.
