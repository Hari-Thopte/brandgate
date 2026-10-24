"""FastAPI demo API for grounded brand-compliance review."""

from __future__ import annotations

import hashlib
import json
import re
import os
import time
import uuid
from typing import Any
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response
from pydantic import BaseModel, Field

ORG_ID = "demo-org"
SAMPLE_AD = (
    "Meet BrightDay, the #1 best wellness app with guaranteed results. "
    "Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. "
    "This thing is totally lit, no cap!"
)

RULES = {
    "rule-superlative": ("#1 best", "Avoid unsupported superlatives."),
    "rule-guarantee": ("guaranteed results", "Guarantees need approved evidence."),
    "rule-clinical": ("clinically proven", "Clinical claims require an approved source."),
    "rule-slang": ("no cap", "Use the approved, professional brand voice."),
    "rule-clarity": ("", "Use clear language that customers can understand."),
    "rule-audience": ("", "Write for the intended customer audience."),
    "rule-privacy": ("", "Do not expose private customer information."),
    "rule-comparison": ("", "Comparisons must be fair and evidenced."),
    "rule-pricing": ("", "Show material price conditions clearly."),
    "rule-availability": ("", "Availability statements must be current."),
    "rule-disclaimer": ("", "Keep required disclaimers near the related claim."),
    "rule-tone": ("", "Keep the tone calm and respectful."),
    "rule-accessibility": ("", "Use accessible and inclusive wording."),
    "rule-brand-name": ("", "Use the approved brand name and spelling."),
    "rule-testimonials": ("", "Testimonials need permission and accurate attribution."),
    "rule-before-after": ("", "Before-and-after claims need substantiation."),
    "rule-scarcity": ("", "Scarcity claims must reflect real availability."),
}
TERMS = {
    "no cap": "Banned term: informal slang", "guaranteed": "Banned term: absolute promise",
    "risk-free": "Requires legal review", "miracle": "Unsupported outcome wording",
    "instant": "Requires evidence", "perfect": "Absolute wording", "always": "Absolute wording",
    "never": "Absolute wording", "cure": "Medical claim; requires approval", "clinically proven": "Requires clinical evidence",
    "best": "Comparative claim; requires evidence", "number one": "Ranking claim; requires evidence",
    "#1": "Ranking claim; requires evidence", "free": "Requires clear conditions", "limited time": "Requires current expiry",
    "act now": "Avoid pressure language", "everyone": "Avoid broad universal claim", "instant results": "Outcome claim; requires evidence",
    "100%": "Absolute claim; requires evidence", "no risk": "Absolute claim; requires evidence",
}
LEDGER = {
    "ledger-offer": {"claim": "Offer valid through 2024-01-01", "status": "Expired"},
    "ledger-users": {"claim": "8,500 registered users", "status": "Supported"},
    "ledger-clinical": {"claim": "Clinical efficacy claim", "status": "Unregistered"},
    "ledger-promo": {"claim": "Demo seasonal offer", "value": "10% off", "status": "Supported", "source": "Illustrative demo offer record", "owner": "Demo brand team", "expires_at": "2026-11-09"},
}


class ItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=12000)


class EditBody(BaseModel):
    suggestion: str = Field(min_length=1, max_length=2000)


class ReasonBody(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class CommentBody(BaseModel):
    comment: str = Field(min_length=1, max_length=2000)


class StatusBody(BaseModel):
    status: Literal["Draft", "Analyzed", "In review", "Approved"]


class GuidelineBody(BaseModel):
    text: str = Field(min_length=3, max_length=500)


app = FastAPI(title="BrandGate", version="0.1.0")
configured_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]
allowed_origins = configured_origins + [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5177", "http://127.0.0.1:5177",
    "http://localhost:5178", "http://127.0.0.1:5178",
    "http://localhost:5179", "http://127.0.0.1:5179",
    "http://localhost:5180", "http://127.0.0.1:5180",
    "http://localhost:5181", "http://127.0.0.1:5181",
    "http://localhost:5182", "http://127.0.0.1:5182",
    "http://localhost:5183", "http://127.0.0.1:5183",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
lock = Lock()
request_windows: dict[str, list[float]] = {}
items: dict[str, dict] = {}
analyses: dict[str, dict] = {}
audit: dict[str, list[dict]] = {}
cache: dict[str, list[dict]] = {}
started_at = time.monotonic()


def cors_headers_for_origin(origin: str | None) -> dict[str, str]:
    """Add CORS headers to limiter responses for allowed browser origins."""
    if not origin or not (origin in allowed_origins or re.fullmatch(r"https://[a-zA-Z0-9-]+\.vercel\.app", origin)):
        return {}
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "X-Request-ID",
        "Vary": "Origin",
    }


@app.middleware("http")
async def request_limits(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """Apply lightweight in-memory body and per-client request limits for the demo."""
    request_id = request.headers.get("x-request-id", "")[:80] or str(uuid.uuid4())
    request.state.request_id = request_id
    early_headers = {**cors_headers_for_origin(request.headers.get("origin")), "X-Request-ID": request_id}
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > 64_000:
        return JSONResponse(status_code=413, content={"detail": "Request body exceeds the 64 KB demo limit."}, headers=early_headers)
    client = request.client.host if request.client else "unknown"
    now_s = time.monotonic()
    recent = [stamp for stamp in request_windows.get(client, []) if now_s - stamp < 60]
    if len(recent) >= 600:
        request_windows[client] = recent
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Wait a minute and retry."}, headers=early_headers)
    recent.append(now_s)
    request_windows[client] = recent
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a generic JSON error without exposing request content or internals."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(status_code=500, content={"detail": "The review service encountered an unexpected error. Retry or use the saved demo result.", "request_id": request_id}, headers={"X-Request-ID":request_id})


def now() -> str:
    """Return a UTC ISO timestamp."""
    return datetime.now(timezone.utc).isoformat()


def require_reviewer(request: Request) -> None:
    """Honor the explicit demo role on review-decision endpoints.

    The role header is a demo UX boundary, not authentication; production deployments
    must replace it with an authenticated identity and server-side role claims.
    """
    role = request.headers.get("x-demo-role", "Reviewer")
    if role != "Reviewer":
        raise HTTPException(status_code=403, detail="Only the Reviewer demo role can record review decisions.")


def require_manager(request: Request) -> None:
    """Restrict brand-reference mutations to the demo Manager role."""
    if request.headers.get("x-demo-role", "Reviewer") != "Manager":
        raise HTTPException(status_code=403, detail="Only the Manager demo role can edit brand data.")


def log_action(item_id: str, action: str, detail: str = "") -> None:
    """Append an auditable, body-free user action."""
    events = audit.setdefault(item_id, [])
    previous = events[-1].get("hash", "0" * 64) if events else "0" * 64
    event = {"at": now(), "action": action, "detail": detail, "prev_hash": previous}
    canonical = json.dumps(audit_payload(event), sort_keys=True, separators=(",", ":"))
    event["hash"] = hashlib.sha256((previous + canonical).encode("utf-8")).hexdigest()
    events.append(event)


def make_finding(text: str, phrase: str, source_id: str, category: str, severity: str, message: str, suggestion: str | None) -> dict | None:
    """Build a finding only when its source exists and its exact span matches."""
    start = text.lower().find(phrase.lower())
    if start < 0 or source_id not in {*RULES, *LEDGER}:
        return None
    span = text[start : start + len(phrase)]
    if span.lower() != phrase.lower():
        return None
    return {"id": str(uuid.uuid4()), "category": category, "severity": severity, "confidence": 1.0,
            "span_start": start, "span_end": start + len(span), "span_text": span, "message": message,
            "suggestion": suggestion, "source_type": "ledger" if source_id.startswith("ledger") else "rule",
            "source_id": source_id, "status": "open", "reason": None}


def analyze_text(text: str) -> list[dict]:
    """Run deterministic checks and validate exact evidence spans."""
    clean = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    checks = [
        ("#1 best", "rule-superlative", "style", "high", "Superlative is not supported by an approved source.", "Remove the superlative."),
        ("guaranteed results", "rule-guarantee", "legal", "high", "A guaranteed outcome needs approved evidence.", "Describe the product without promising an outcome."),
        ("clinically proven", "ledger-clinical", "fact", "high", "This clinical claim is unregistered in the Facts Ledger.", "Remove or substantiate the claim."),
        ("10k users", "ledger-users", "fact", "medium", "The approved ledger says 8,500 registered users.", "Use the supported figure: 8,500 registered users."),
        ("2024-01-01", "ledger-offer", "fact", "high", "The offer date in the ledger has expired.", "Confirm a current offer date before publishing."),
        ("no cap", "rule-slang", "banned_term", "medium", "This term is listed as banned for the brand.", "Replace with neutral brand language."),
    ]
    found = [make_finding(clean, phrase, sid, category, severity, message, suggestion)
             for phrase, sid, category, severity, message, suggestion in checks]
    return [finding for finding in found if finding is not None]


def load_sample_fallback(text: str) -> list[dict]:
    """Load and validate the committed sample fixture, assigning fresh IDs."""
    fallback_path = Path(__file__).parent / "fallbacks" / "sample.json"
    try:
        stored = json.loads(fallback_path.read_text(encoding="utf-8"))
        valid = [finding for finding in stored if text[finding["span_start"]:finding["span_end"]] == finding["span_text"] and finding["source_id"] in {*RULES, *LEDGER}]
        return [dict(finding, id=str(uuid.uuid4())) for finding in valid]
    except (OSError, json.JSONDecodeError, KeyError, TypeError):
        return analyze_text(text)


def run_analysis(analysis_id: str, item_id: str) -> None:
    """Run the pipeline and fall back to the committed sample fixture on failure."""
    try:
        _run_analysis(analysis_id, item_id)
    except Exception:
        item = items.get(item_id)
        analysis = analyses.get(analysis_id)
        if not item or not analysis:
            return
        if item["text"].strip() == SAMPLE_AD:
            with lock:
                analysis.update(stage="Complete (stored fallback)", stage_index=8, status="complete",
                                ai_status="unavailable", findings=load_sample_fallback(SAMPLE_AD), timings_ms={})
                item["status"] = "Analyzed"
            log_action(item_id, "Analysis completed", "Stored sample fallback")
        else:
            with lock:
                analysis.update(stage="Failed", status="failed", error="Analysis could not complete. Please try again.")


def _run_analysis(analysis_id: str, item_id: str) -> None:
    """Run stages and expose current stage while preserving sample fallback."""
    analysis_started = time.perf_counter()
    text = items[item_id]["text"]
    key = hashlib.sha256(" ".join(text.split()).lower().encode()).hexdigest()
    cache_hit = key in cache
    stages = ["Ingest", "Sanitize", "Deterministic checks", "Rule retrieval", "Ledger match", "Grounded LLM review (unavailable; deterministic only)", "Grounding validator", "Merge & score"]
    timings: dict[str, float] = {}
    for index, stage in enumerate(stages, start=1):
        start = time.perf_counter()
        with lock:
            analyses[analysis_id].update(stage=stage, stage_index=index, status="running")
        if index == 3:
            found = cache.get(key) or analyze_text(text)
        if index == 7:
            found = [f for f in found if f["source_id"] in {*RULES, *LEDGER} and text[f["span_start"]:f["span_end"]] == f["span_text"]]
        if index == 8:
            cache[key] = found
        time.sleep(0.13)
        timings[stage] = round((time.perf_counter() - start) * 1000, 2)
    if text.strip() == SAMPLE_AD:
        found = load_sample_fallback(SAMPLE_AD)
    with lock:
        analyses[analysis_id].update(stage="Complete", stage_index=8, status="complete", ai_status="unavailable",
                                     findings=found, timings_ms=timings,
                                     total_ms=round((time.perf_counter() - analysis_started) * 1000, 2),
                                     cache_hit=cache_hit)
        items[item_id]["status"] = "Analyzed"
    log_action(item_id, "Analysis completed", f"{len(found)} findings")


@app.get("/health")
def health() -> dict:
    """Report API liveness."""
    return {"status": "ok", "mode": "local-demo"}


@app.get("/health/ready")
def health_ready() -> dict:
    """Report readiness for the in-memory deterministic demo and optional model path."""
    return {"status": "ready", "db": "in-memory demo", "llm": "unavailable", "llm_key_present": bool(os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")),
            "version": app.version, "uptime_s": round(time.monotonic() - started_at, 2)}


@app.get("/ready")
def readiness_alias() -> dict:
    """Provide a short readiness URL for deploy probes and local diagnostics."""
    return health_ready()


@app.post("/demo/reset")
def reset_demo() -> dict:
    """Reset ephemeral demo data."""
    with lock:
        items.clear(); analyses.clear(); audit.clear(); cache.clear(); request_windows.clear()
    return {"status": "reset"}


@app.post("/items")
def create_item(body: ItemCreate) -> dict:
    """Create a demo item for the fixed demo organization."""
    item_id = str(uuid.uuid4())
    items[item_id] = {"id": item_id, "org_id": ORG_ID, "text": body.text, "status": "Draft", "version": 2 if body.text.strip() == SAMPLE_AD else 1, "created_at": now()}
    audit[item_id] = []
    log_action(item_id, "Item created")
    return items[item_id]


@app.get("/items/{item_id}")
def get_item(item_id: str) -> dict:
    """Return an item only when it belongs to this API's demo organization."""
    item = items.get(item_id)
    if not item or item.get("org_id") != ORG_ID:
        raise HTTPException(404, "Item not found")
    return item


@app.get("/items/{item_id}/analysis")
def get_item_analysis(item_id: str) -> dict:
    """Return the newest analysis for an organization-scoped item."""
    if item_id not in items or items[item_id].get("org_id") != ORG_ID:
        raise HTTPException(404, "Item not found")
    matches = [row for row in analyses.values() if row.get("item_id") == item_id]
    if not matches:
        raise HTTPException(404, "Analysis not found")
    return max(matches, key=lambda row: row.get("created_at", ""))


@app.post("/items/{item_id}/analyze", status_code=202)
def start_analysis(item_id: str, tasks: BackgroundTasks) -> dict:
    """Start an analysis and return a pollable ID."""
    if item_id not in items or items[item_id]["org_id"] != ORG_ID:
        raise HTTPException(404, "Item not found")
    analysis_id = str(uuid.uuid4())
    analyses[analysis_id] = {"id": analysis_id, "item_id": item_id, "status": "queued", "stage": "Queued", "stage_index": 0, "total_stages": 8, "findings": [], "timings_ms": {}, "total_ms": None, "cache_hit": False, "created_at": now()}
    tasks.add_task(run_analysis, analysis_id, item_id)
    return {"analysis_id": analysis_id}


@app.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str) -> dict:
    """Return stage progress, timings, and grounded findings."""
    result = analyses.get(analysis_id)
    item = items.get(result.get("item_id", "")) if result else None
    if not result or not item or item.get("org_id") != ORG_ID:
        raise HTTPException(404, "Analysis not found")
    return result


def find_finding(finding_id: str) -> tuple[dict, str]:
    """Find a finding and enforce the demo organization boundary."""
    for analysis in analyses.values():
        for finding in analysis["findings"]:
            if finding["id"] == finding_id:
                item = items.get(analysis["item_id"])
                if item and item["org_id"] == ORG_ID:
                    return finding, item["id"]
    raise HTTPException(404, "Finding not found")


@app.post("/findings/{finding_id}/accept")
def accept_finding(finding_id: str, request: Request) -> dict:
    """Record a human accept action."""
    require_reviewer(request)
    finding, item_id = find_finding(finding_id); finding["status"] = "accepted"; log_action(item_id, "Finding accepted", finding_id)
    return finding


@app.post("/findings/{finding_id}/edit")
def edit_finding(finding_id: str, body: EditBody, request: Request) -> dict:
    """Record a human edit without applying copy automatically."""
    require_reviewer(request)
    finding, item_id = find_finding(finding_id); finding.update(status="edited", suggestion=body.suggestion); log_action(item_id, "Finding edited", finding_id)
    return finding


@app.post("/findings/{finding_id}/dismiss")
def dismiss_finding(finding_id: str, body: ReasonBody, request: Request) -> dict:
    """Require and store a dismissal reason."""
    require_reviewer(request)
    finding, item_id = find_finding(finding_id); finding.update(status="dismissed", reason=body.reason); log_action(item_id, "Finding dismissed", body.reason)
    return finding


@app.post("/items/{item_id}/comments")
def add_comment(item_id: str, body: CommentBody, request: Request) -> dict:
    """Store a reviewer comment as an audited event."""
    require_reviewer(request)
    if item_id not in items or items[item_id]["org_id"] != ORG_ID: raise HTTPException(404, "Item not found")
    log_action(item_id, "Comment added", body.comment)
    return {"comment": body.comment, "at": audit[item_id][-1]["at"]}


@app.post("/items/{item_id}/status")
def update_status(item_id: str, body: StatusBody, request: Request) -> dict:
    """Move the human approval stepper and audit the change."""
    require_reviewer(request)
    if item_id not in items or items[item_id]["org_id"] != ORG_ID: raise HTTPException(404, "Item not found")
    if body.status == "Approved":
        item_analyses = [analysis for analysis in analyses.values() if analysis["item_id"] == item_id]
        if not item_analyses or any(f["status"] == "open" for a in item_analyses for f in a["findings"]):
            raise HTTPException(409, "Resolve every finding before approval")
    items[item_id]["status"] = body.status
    if body.status == "Draft":
        items[item_id]["version"] = int(items[item_id].get("version", 1)) + 1
    log_action(item_id, "Status changed", f"{body.status} · v{items[item_id].get('version', 1)}")
    return {"status": body.status, "version": items[item_id].get("version", 1)}


@app.get("/items/{item_id}/audit")
def get_audit(item_id: str) -> dict:
    """Return the item's append-only demo event timeline."""
    if item_id not in items or items[item_id]["org_id"] != ORG_ID: raise HTTPException(404, "Item not found")
    return {"events": audit[item_id]}


def audit_payload(event: dict[str, Any]) -> dict[str, str]:
    """Return the canonical fields covered by an audit event hash."""
    return {key: str(event.get(key, "")) for key in ("at", "action", "detail")}


@app.get("/items/{item_id}/audit/verify")
def verify_audit(item_id: str) -> dict:
    """Verify the item's append-only hash chain and identify the first broken row."""
    if item_id not in items or items[item_id].get("org_id") != ORG_ID:
        raise HTTPException(404, "Item not found")
    previous = "0" * 64
    for index, event in enumerate(audit.get(item_id, [])):
        payload = json.dumps(audit_payload(event), sort_keys=True, separators=(",", ":"))
        expected = hashlib.sha256((previous + payload).encode("utf-8")).hexdigest()
        if event.get("prev_hash") != previous or event.get("hash") != expected:
            return {"ok": False, "checked": index, "broken_at": index}
        previous = expected
    return {"ok": True, "checked": len(audit.get(item_id, [])), "broken_at": None}


@app.get("/brand/guidelines")
def guidelines() -> dict:
    """Return seeded demo guidelines."""
    return {"items": [{"id": key, "text": value[1]} for key, value in RULES.items()]}


@app.post("/brand/guidelines")
def add_guideline(body: GuidelineBody, request: Request) -> dict:
    """Add a demo rule when the Manager role explicitly requests it."""
    require_manager(request)
    rule_id = f"rule-{uuid.uuid4().hex[:10]}"
    RULES[rule_id] = ("", body.text)
    return {"id": rule_id, "text": body.text}


@app.put("/brand/guidelines/{rule_id}")
def edit_guideline(rule_id: str, body: GuidelineBody, request: Request) -> dict:
    """Edit a seeded demo guideline as the Manager role."""
    require_manager(request)
    if rule_id not in RULES:
        raise HTTPException(status_code=404, detail="Guideline not found")
    RULES[rule_id] = (RULES[rule_id][0], body.text)
    return {"id": rule_id, "text": body.text}


@app.delete("/brand/guidelines/{rule_id}")
def delete_guideline(rule_id: str, request: Request) -> dict:
    """Remove a demo guideline as the Manager role."""
    require_manager(request)
    if rule_id not in RULES:
        raise HTTPException(status_code=404, detail="Guideline not found")
    RULES.pop(rule_id)
    return {"deleted": rule_id}


@app.get("/brand/terms")
def terms() -> dict:
    """Return seeded demo terms."""
    return {"items": [{"term": key, "meaning": value} for key, value in TERMS.items()]}


@app.get("/brand/ledger")
def ledger() -> dict:
    """Return seeded demo Facts Ledger entries."""
    return {"items": [{"id": key, **value} for key, value in LEDGER.items()]}
