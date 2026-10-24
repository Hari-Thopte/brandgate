# Round 3 plan

The following are planned improvements. They are not implemented in this Round 2 prototype.

1. **Facts Ledger expiry alerts and uploads.** Add CSV/PDF ingest into a staging view, validate extracted fields and expiry dates, then require a human to confirm facts before they become approved ledger evidence. Add configurable expiry alerts. No uploaded record should become evidence automatically.
2. **Guideline Health.** Use stored dismissal reasons to identify rules that may be noisy or unclear. Show examples and let a manager revise rules; do not automatically rewrite policy.
3. **Evaluation Harness.** Create a labelled set of ad examples, compute precision/recall by rule, and run regression comparisons before rule changes are published.

These plans follow the current Round 2 demo limits: no connected Supabase, LLM provider, uploads, guideline editor, or evaluation UI is configured.
