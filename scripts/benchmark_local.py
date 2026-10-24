"""Collect local sample-analysis timings for the demo API (not production benchmarks)."""

from __future__ import annotations

import json
import math
import time
import urllib.request
from collections import defaultdict
from typing import Any

API = "http://127.0.0.1:8000"
SAMPLE = (
    "Meet BrightDay, the #1 best wellness app with guaranteed results. "
    "Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. "
    "This thing is totally lit, no cap!"
)


def call(path: str, method: str = "GET", body: dict[str, Any] | None = None) -> Any:
    """Send a JSON API request to the local demo server."""
    payload = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        API + path, data=payload, method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read())


def run_one() -> dict[str, Any]:
    """Create and poll one planted-sample analysis until completion."""
    item = call("/items", "POST", {"text": SAMPLE})
    analysis_id = call(f"/items/{item['id']}/analyze", "POST", {})["analysis_id"]
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        analysis = call(f"/analyses/{analysis_id}")
        if analysis.get("status") == "complete":
            return analysis
        if analysis.get("status") == "failed":
            raise RuntimeError(str(analysis))
        time.sleep(0.7)
    raise TimeoutError("Analysis did not complete in 10 seconds")


def percentile(values: list[float], fraction: float) -> float:
    """Return nearest-rank percentile from a non-empty sample."""
    ordered = sorted(values)
    return ordered[max(0, math.ceil(fraction * len(ordered)) - 1)]


def main() -> None:
    """Measure 20 cache misses and 20 warm cache hits on the local process."""
    call("/demo/reset", "POST", {})
    call("/health")
    cold: list[dict[str, Any]] = []
    for _ in range(20):
        call("/demo/reset", "POST", {})
        cold.append(run_one())
    call("/demo/reset", "POST", {})
    run_one()  # Seed the sample result in the in-process SHA-256 cache.
    warm: list[dict[str, Any]] = [run_one() for _ in range(20)]
    for label, results in (("miss", cold), ("hit", warm)):
        totals = [float(row["total_ms"]) for row in results]
        print(f"cache_{label}: n={len(results)}, p50={percentile(totals, .50):.2f}ms, p95={percentile(totals, .95):.2f}ms")
        stages: dict[str, list[float]] = defaultdict(list)
        for row in results:
            for stage, value in row["timings_ms"].items():
                stages[stage].append(float(value))
        for stage, values in stages.items():
            print(f"  {stage}: p50={percentile(values, .50):.2f}ms, p95={percentile(values, .95):.2f}ms")


if __name__ == "__main__":
    main()
