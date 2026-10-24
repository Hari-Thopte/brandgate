# BrandGate visual bug-fix evidence

Screenshots were captured with Chromium at a 1440 × 1100 viewport. Full-page captures are 1440 px wide. The `before/` and `after/` crops document the requested 14-item visual bug-fix pass. The app then received the larger Phase 3–6 redesign; use `qa/after-final/` for the current screenshots. Current visual styles live in `frontend/src/style.css` (the temporary override stylesheet used during the earlier fix pass has since been consolidated).

| # | Before | After | Files changed |
|---|---|---|---|
| 1. Secondary text | [Landing copy](before/01-secondary-copy.png) | [Landing copy](after/01-secondary-copy.png) | `frontend/src/style.css` |
| 2. Role switcher | [Role control](before/02-role-switcher.png) | [Role control](after/02-role-switcher.png) | `frontend/src/style.css` |
| 3. Navigation | [Navigation](before/03-navigation.png) | [Navigation](after/03-navigation.png) | `frontend/src/style.css` |
| 4. Hero glow | [Landing hero](before/04-hero-glow.png) | [Landing hero](after/04-hero-glow.png) | `frontend/src/style.css` |
| 5. Full-width bands | [Landing page](before/landing-full.png) | [Landing page](after/landing-full.png) | `frontend/src/style.css` |
| 6. Navy band cards | [Trust band](before/06-navy-band.png) | [Trust band](after/06-navy-band.png) | `frontend/src/style.css` |
| 7. Stats strip | [Stats](before/07-stats-strip.png) | [Stats](after/07-stats-strip.png) | `frontend/src/style.css` |
| 8. Hero workspace mock | [Mock workspace](before/08-hero-mock.png) | [Mock workspace](after/08-hero-mock.png) | `frontend/src/main.js`, `frontend/src/style.css` |
| 9. How / evidence / human review cards | [How it works](before/09-how-it-works.png), [Evidence](before/09-evidence-card.png), [Human review](before/09-human-review-card.png) | [How it works](after/09-how-it-works.png), [Evidence](after/09-evidence-card.png), [Human review](after/09-human-review-card.png) | `frontend/src/style.css` |
| 10. Workspace | [Summary](before/10-workspace-summary.png), [Fallback](before/10-local-fallback-banner.png), [Review summary](before/10-review-summary.png), [Analysis pill](before/10-analysis-pill.png), [Paper + insights](before/10-paper-and-insights.png), [Finding](before/10-finding-card.png) | [Summary](after/10-workspace-summary.png), [Fallback](after/10-local-fallback-banner.png), [Review summary](after/10-review-summary.png), [Analysis pill](after/10-analysis-pill.png), [Paper + insights](after/10-paper-and-insights.png), [Finding](after/10-finding-card.png) | `frontend/src/main.js`, `frontend/src/style.css` |
| 11. Audit timeline | [Timeline](before/11-audit-timeline.png) | [Timeline](after/11-audit-timeline.png) | `frontend/src/style.css` |
| 12. Start page samples / Analyze | [Samples](before/12-start-samples.png), [Full page](before/start-full.png) | [Samples](after/12-start-samples.png), [Full page](after/start-full.png) | `frontend/src/main.js`, `frontend/src/style.css` |
| 13. Typography / local fonts | [Hero type](before/13-typography.png) | [Hero type](after/13-typography.png) | `frontend/src/main.js`, `frontend/src/style.css`, self-hosted font assets |
| 14. Contrast | [Landing](before/14-contrast-landing.png), [Start](before/14-contrast-start.png), [Workspace](before/14-contrast-workspace.png), [Audit](before/14-contrast-audit.png) | [Landing](after/14-contrast-landing.png), [Start](after/14-contrast-start.png), [Workspace](after/14-contrast-workspace.png), [Audit](after/14-contrast-audit.png), [Automated report](after/contrast-audit.json) | `frontend/src/style.css`, `scripts/visual_contrast_audit.mjs` |

## Other requested captures

- [Landing](after/landing-full.png)
- [Start](after/start-full.png)
- [Workspace top](after/workspace-top.png) · [Workspace scrolled](after/workspace-scrolled.png)
- [Audit page](after/audit-full.png)
- [Playwright capture metadata](after/capture-meta.json) · [Browser errors](after/browser-errors.json)

## Current redesigned page captures

- [Landing at 1440, light](../../../qa/after-final/landing-1440-light.png) · [dark](../../../qa/after-final/landing-1440-dark.png)
- [Start at 1440, light](../../../qa/after-final/start-1440-light.png)
- [Workspace at 1440, light](../../../qa/after-final/workspace-1440-light.png) · [dark](../../../qa/after-final/workspace-1440-dark.png)
- [Audit at 1440, light](../../../qa/after-final/audit-1440-light.png)
- [All 100 final captures and metadata](../../../qa/after-final/)

Screenshot and audit scripts: `scripts/visual_bugfix_evidence.mjs` and `scripts/visual_contrast_audit.mjs`.
