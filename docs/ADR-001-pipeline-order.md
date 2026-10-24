# ADR-001: Ledger matching before LLM review

Status: accepted

Facts Ledger matching runs before any optional grounded LLM review. The model context can therefore include only retrieved rules and matching ledger rows. Deterministic checks always run, and an unavailable model does not block findings. Findings without a seeded source ID or exact matching span are dropped.
