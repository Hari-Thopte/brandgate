# Round 2 feature inventory

This describes the local demo implementation. The public deployment and persistent database are not configured.

| Feature | Where to find it | Status / boundary |
| --- | --- | --- |
| No-sign-up landing and role switcher | Landing top bar | Demo role changes UI context only; no authentication or real authorization. |
| Sample ad with planted mistakes | Submit screen → sample selector | Six deterministic, exact-span findings; bundled saved result can be selected when API is unavailable. |
| Analysis and stage progress | Submit → Analyze; Workspace pipeline row | Eight displayed stages; deterministic demo implementation, optional LLM marked unavailable. |
| Review findings | Workspace center/right panes | Highlight, category, severity, confidence, source evidence, Accept/Edit/Dismiss. |
| Human approval and audit | Workspace → resolve findings → Approve; audit panel | Approval gate requires findings resolved; each action is recorded in ephemeral demo storage. |
| Brand Hub | Top navigation → Brand Hub | Read-only guidelines, terms, and three demo ledger records. |
| AI & Privacy | Top navigation → AI & Privacy | Explains the current demo model path and data handling. |
| Draft recovery and shortcuts | Submit/workspace | Local browser storage and keyboard shortcuts; not shared across devices. |
| Export | Audit/report actions | Markdown, JSON, and print; export is not a public share link. |
| Offline saved-result mode | Analyze when API cannot be reached | Explicitly labelled saved-result mode; session-local review history. |

Not implemented as production services: Supabase persistence/RLS, live LLM calls, notifications, queue/dashboard, live sharing, and hosting. See [TECH_AND_IMPLEMENTATION.md](TECH_AND_IMPLEMENTATION.md).
