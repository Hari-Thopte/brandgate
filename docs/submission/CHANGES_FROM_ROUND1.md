# Changes from Round 1 plan

- **Ledger before model review:** retained as the chosen pipeline order so any optional review stage receives ledger context.
- **Heuristic scores:** shown as heuristics; they are not model confidence, legal approval, or accuracy measurements.
- **Offline demo path:** added a labelled saved-result option for the planted sample so a stopped/unavailable API does not prevent reviewing the sample. Offline actions remain local to the browser session.
- **Ledger upload deferred:** Round 2 keeps the Brand Hub read-only; upload and expiry notifications are planned for Round 3.
- **Local runtime simplified:** the current judge-ready local slice uses Vite and FastAPI with in-memory state. It differs from the planned Next.js/Supabase deployment architecture; persistent storage and authenticated org isolation are not complete.
- **Deployment status:** deployment files and verification instructions are prepared, but no hosted URL or credentials were supplied, so deployment completion is not claimed.
