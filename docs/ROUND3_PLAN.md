# Round 3 plan

These are planned improvements, not shipped functionality or measured outcomes. Rough effort assumes the existing FastAPI/Supabase direction and should be revisited after the Round 3 window is confirmed.

## 1. Facts Ledger expiry alerts and upload

- **Goal:** keep offer, pricing, and substantiation records current and make new evidence easier to register.
- **User value:** reviewers can distinguish expired evidence before approving a claim; managers can maintain records without code changes.
- **Design:** add a manager-only ledger upload/review flow for CSV and PDF. Parse into a staging area, show extracted fields and validation errors, and require a human to confirm before publishing. Add expiry date filters and alerts at configurable intervals. Never treat extracted text as approved evidence automatically.
- **Data model:** `uploads` tracks org, uploader, object path, checksum, status, and timestamps; `ledger_entries` gains `valid_from`, `expires_at`, `evidence_uri`, and `review_status`; `notifications` records recipient, ledger entry, alert type, delivery state, and timestamps. Enforce org foreign keys and RLS.
- **Success metric:** fraction of expired entries flagged before review; ingestion field accuracy on a labelled fixture set; time from upload to approved ledger entry. Establish baselines before claiming improvement.
- **Risks:** poor extraction, duplicate evidence, unsafe files, stale notifications, and accidental approval. Mitigate with file limits/type validation, checksums, human confirmation, and audit events.
- **Rough effort:** 2–3 weeks including file security, staging UI, tests, and alert delivery.

## 2. Guideline Health

- **Goal:** find rules that are confusing, noisy, or poorly supported using reviewer feedback.
- **User value:** brand teams can prioritize rule clarification based on actual review behavior.
- **Design:** aggregate dismissal reasons and finding outcomes by rule for authorized managers. Require a minimum sample size, display the denominator, and label results as signals rather than quality scores. Do not expose individual comments broadly.
- **Data model:** `dismissal_reasons` references org, finding, rule/source, reason code, optional redacted note, reviewer, and timestamp; a derived `guideline_health_snapshots` table stores counts and computed rates with the query window.
- **Success metric:** share of rules reviewed and subsequently clarified; precision of noisy-rule flags against manager-labelled examples. No target until a baseline dataset exists.
- **Risks:** small samples, reviewer bias, sensitive comments, and teams optimizing against the metric. Apply minimum cohort sizes, access controls, retention policy, and human interpretation.
- **Rough effort:** 1–2 weeks for aggregation, privacy review, and manager UI.

## 3. Evaluation Harness

- **Goal:** measure rule-level quality and catch regressions before release.
- **User value:** engineers and brand owners can see which checks improve or regress on a stable labelled set.
- **Design:** version a labelled corpus, run deterministic and optional model stages, validate exact source/span grounding, compare to expected findings, and publish a regression report. Keep model outputs separate from approved labels.
- **Data model:** `eval_cases` contains case ID, org/suite, redacted text or fixture reference, expected rule IDs, exact spans, labels, and version; `eval_runs` stores code/model/prompt versions, run time, aggregate metrics, and result artifact; per-case results store predicted IDs/spans and error categories.
- **Success metric:** report precision, recall, F1, grounded-span pass rate, and latency per rule and overall. Define release gates after a representative labelled set and baseline exist.
- **Risks:** unrepresentative data, label disagreement, private copy leakage, and metric gaming. Use reviewed fixtures, access controls, data minimization, and documented annotation guidance.
- **Test-set format:** JSONL records with `case_id`, `text`, `expected_findings` (`rule_id`, `span_start`, `span_end`, `span_text`, `label`), plus `suite_version`. Validate span equality before scoring. For each rule: `precision=TP/(TP+FP)`, `recall=TP/(TP+FN)`; report undefined denominators as N/A, not zero.
- **Rough effort:** 2 weeks for corpus tooling, runner, metric report, and CI integration; longer if the labelled corpus needs collection.
