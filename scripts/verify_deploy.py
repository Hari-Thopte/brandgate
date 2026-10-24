"""Check a deployed Brand Review frontend/API pair without external dependencies."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from typing import Any

SAMPLE = (
    "Meet BrightDay, the #1 best wellness app with guaranteed results. "
    "Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. "
    "This thing is totally lit, no cap!"
)


def request_json(url: str, *, method: str = "GET", body: dict[str, Any] | None = None,
                 headers: dict[str, str] | None = None, timeout: float = 15) -> tuple[int, dict[str, str], Any]:
    """Send a JSON request and return status, headers, and decoded JSON."""
    payload = json.dumps(body).encode() if body is not None else None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=payload, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode()
            try:
                decoded = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                decoded = raw
            return response.status, {key.lower(): value for key, value in response.headers.items()}, decoded
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors="replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return exc.code, dict(exc.headers.items()), parsed


def check(label: str, operation: Callable[[], tuple[bool, str]], fix: str) -> bool:
    """Run one check and print an actionable PASS/FAIL line."""
    try:
        passed, detail = operation()
    except Exception as exc:  # Network failures should not hide later independent checks.
        passed, detail = False, str(exc)
    print(f"{'PASS' if passed else 'FAIL'} · {label}: {detail}")
    if not passed:
        print(f"  Likely fix: {fix}")
    return passed


def main() -> int:
    """Run deployment checks and return a failing exit code when any check fails."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend-url", required=True, help="deployed frontend origin")
    parser.add_argument("--api-url", required=True, help="deployed FastAPI base URL")
    args = parser.parse_args()
    frontend_url = args.frontend_url.rstrip("/")
    api_url = args.api_url.rstrip("/")
    all_passed = True
    all_passed &= check("API health", lambda: _check_health(api_url),
                        "Check the Render deploy logs and the /health path.")
    all_passed &= check("CORS preflight", lambda: _check_cors(api_url, frontend_url),
                        "Set ALLOWED_ORIGINS to the exact frontend origin, then redeploy the API.")
    frontend_ok = False
    try:
        with urllib.request.urlopen(frontend_url, timeout=15) as response:
            frontend_ok = response.status == 200
        detail = f"HTTP {200 if frontend_ok else 'non-200'}"
    except Exception as exc:
        detail = str(exc)
    all_passed &= check("Frontend reachable", lambda: (frontend_ok, detail),
                        "Confirm the Vercel deployment URL and build output directory `dist`.")

    try:
        started = time.perf_counter()
        status, _, item = request_json(f"{api_url}/items", method="POST", body={"text": SAMPLE})
        created_ms = (time.perf_counter() - started) * 1000
        if status != 200 or not isinstance(item, dict) or not item.get("id"):
            raise RuntimeError(f"POST /items returned HTTP {status}: {item}")
        status, _, analysis_start = request_json(f"{api_url}/items/{item['id']}/analyze", method="POST", body={})
        if status != 202 or not analysis_start.get("analysis_id"):
            raise RuntimeError(f"POST analyze returned HTTP {status}: {analysis_start}")
        analysis_id = analysis_start["analysis_id"]
        deadline = time.monotonic() + 25
        analysis: dict[str, Any] = {}
        while time.monotonic() < deadline:
            status, _, analysis = request_json(f"{api_url}/analyses/{analysis_id}")
            if status != 200:
                raise RuntimeError(f"GET analysis returned HTTP {status}: {analysis}")
            if analysis.get("status") in {"complete", "failed"}:
                break
            time.sleep(0.25)
        elapsed_ms = (time.perf_counter() - started) * 1000
        findings = analysis.get("findings", [])
        grounded = all(SAMPLE[f["span_start"]:f["span_end"]] == f["span_text"] and f.get("source_id")
                       for f in findings)
        complete = analysis.get("status") == "complete"
        all_passed &= check("Sample analysis", lambda: (complete and len(findings) >= 6 and grounded,
                                                         f"status={analysis.get('status')}, findings={len(findings)}, elapsed={elapsed_ms:.0f}ms, create={created_ms:.0f}ms"),
                            "Check API logs, seed/fallback file, request size, and analysis route.")
        timings = analysis.get("timings_ms", {})
        if timings:
            print("  Stage timings (reported by API): " + ", ".join(f"{name}={value}ms" for name, value in timings.items()))
            print(f"  API total={analysis.get('total_ms', 'unavailable')}ms; cache_hit={analysis.get('cache_hit', 'unavailable')}")
    except Exception as exc:
        all_passed &= check("Sample analysis", lambda: (False, str(exc)),
                            "Check API logs, CORS, deployment state, and request route/body.")
    print("DEPLOY VERIFY: " + ("ALL CHECKS PASSED" if all_passed else "CHECK FAILURES"))
    return 0 if all_passed else 1


def _check_health(api_url: str) -> tuple[bool, str]:
    """Check API liveness while allowing the runner to continue after network errors."""
    status, _, payload = request_json(f"{api_url}/health")
    return status == 200 and isinstance(payload, dict) and payload.get("status") == "ok", str(payload)


def _check_cors(api_url: str, frontend_url: str) -> tuple[bool, str]:
    """Check an OPTIONS preflight for the configured frontend origin."""
    status, headers, _ = request_json(
        f"{api_url}/items", method="OPTIONS",
        headers={"Origin": frontend_url, "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "content-type"},
    )
    origin = headers.get("access-control-allow-origin", "")
    return status == 200 and origin == frontend_url, origin or "No allow-origin header"


if __name__ == "__main__":
    sys.exit(main())
