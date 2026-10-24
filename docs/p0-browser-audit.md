# P0 local browser audit

Checked in the local browser on 2026-10-23. Production URL, cold start, incognito, and second-browser checks are still pending because no deployment URL is configured.

| Flow step | Result | Evidence / note |
| --- | --- | --- |
| Landing opens | Pass | Local Vite page at `http://127.0.0.1:5174/`. |
| Role switcher | Pass | Creator, Reviewer, and Manager options available. |
| Submit and load planted sample | Pass | Sample ad loads into the submit flow. |
| Analyze online | Pass | API returned six findings with exact spans. |
| Review workspace | Pass | Findings and corresponding text highlights rendered. |
| Accept / Edit / Dismiss with reason | Pass | Each decision worked; dismiss required a reason. |
| Add reviewer comment | Pass | Comment appeared in the audit history. |
| Move status to Approved | Pass | Stepper reached Approved after review actions. |
| Audit timeline | Pass | Analysis, finding decisions, comment, and status events shown. |
| Brand Hub: Guidelines, Terms, Facts Ledger | Pass | All three tabs loaded in local demo. |
| AI & Privacy | Pass | Page explains current model and storage boundaries. |
| Empty input guard | Pass | Analyze is disabled when copy is empty. |
| API unavailable recovery | Pass | Retry and saved-result choices appear. |
| Offline saved-result workflow | Pass | Six validated fixture findings; decisions, comment, approval, and audit work locally with an Offline demo mode banner. |
| Public deployment smoke / cold start / incognito / second browser | Pending | Requires a deployed URL and host access. |

Offline review is a local browser-session simulation. It does not run the pipeline or persist decisions to the API.

## UX upgrade verification

| Upgrade | Result | Evidence / limitation |
| --- | --- | --- |
| Landing story, review CTA, nav and role context | Pass | Browser showed all four static story sections and the role-specific context. |
| Three sample choices and checks list | Pass | Risky sample loaded; clean and expired-offer choices are also available. |
| Reviewer workspace score and approval gate | Pass | Sample score changed from 26 to 41 after accepting one high finding; approval stayed disabled while high findings remained open. |
| Original / Revised preview | Pass | Accepted suggestion appeared only in Revised; original copy remained unchanged. |
| Decided findings collapse | Pass | Decided group expands/collapses separately from open findings. |
| Creator read-only behavior | Pass | Findings had no decision controls; comment and approve actions were disabled/replaced. |
| Audit filtering and report controls | Pass | Status filter narrowed the timeline; Markdown, JSON and Print actions rendered. |
| Brand Hub search/counts/status chips | Pass | 17 guidelines, 20 terms and 3 facts; status chips include text and symbols. |
| Queue, live model, database persistence, production deployment | Deferred | Queue is excluded by Round 2 PRD; no credentials or public URL are configured. Ledger expiry metadata and real actor identity are absent from demo data. |
