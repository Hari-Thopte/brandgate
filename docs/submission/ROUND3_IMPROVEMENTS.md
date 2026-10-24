# Round 3 improvements

## Facts Ledger expiry alerts and upload

Build a staged CSV/PDF import, validate extracted evidence, require human approval before ledger publication, and alert owners before entries expire. Add validity metadata and audited upload/approval records. Measure extraction quality and expired-entry detection against reviewed fixtures. Main risks are extraction errors, stale alerts, and accidental approval; human confirmation and strict file limits are required.

## Guideline Health

Aggregate dismissal reasons by rule with privacy thresholds and show managers which guidelines may be unclear or noisy. Store reason codes with org/rule references, retain redacted notes only if needed, and show sample counts and time windows. Validate signals with manager-labelled cases; do not treat rates as rule quality without review.

## Evaluation Harness

Create versioned JSONL labelled cases, an evaluation runner, and per-rule precision/recall/F1, grounded-span validity, and latency reports. Keep labels separate from model output and require reviewed labels before setting release gates. The detailed data model, formulas, risks, and rough effort are in [ROUND3_PLAN.md](../ROUND3_PLAN.md).
