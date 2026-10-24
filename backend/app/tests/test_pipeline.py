"""Pipeline checks for exact spans and seeded source grounding."""

from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import (SAMPLE_AD, ReasonBody, StatusBody, analyze_text, audit,
                      dismiss_finding, items, analyses, load_sample_fallback,
                      get_audit, update_status, app, cors_headers_for_origin)

client = TestClient(app)


def reviewer_request(role: str = "Reviewer") -> Request:
    return Request({"type": "http", "headers": [(b"x-demo-role", role.encode())]})


def test_sample_ad_returns_grounded_findings() -> None:
    findings = analyze_text(SAMPLE_AD)
    assert len(findings) >= 6
    assert all(SAMPLE_AD[f["span_start"]:f["span_end"]] == f["span_text"] for f in findings)
    assert all(f["source_id"] for f in findings)


def test_missing_terms_do_not_create_findings() -> None:
    assert analyze_text("A calm and simple description.") == []


def test_sample_fallback_is_stored_and_grounded() -> None:
    findings = load_sample_fallback(SAMPLE_AD)
    assert len(findings) == 6
    assert all(SAMPLE_AD[f["span_start"]:f["span_end"]] == f["span_text"] for f in findings)


def test_review_actions_require_reason_and_block_early_approval() -> None:
    item_id = str(uuid4())
    finding_id = str(uuid4())
    analysis_id = str(uuid4())
    items[item_id] = {"id": item_id, "org_id": "demo-org", "status": "In review"}
    audit[item_id] = []
    analyses[analysis_id] = {"item_id": item_id, "findings": [{"id": finding_id, "status": "open"}]}
    with pytest.raises(HTTPException) as approval_error:
        update_status(item_id, StatusBody(status="Approved"), reviewer_request())
    assert approval_error.value.status_code == 409
    with pytest.raises(ValidationError):
        ReasonBody(reason="")
    dismiss_finding(finding_id, ReasonBody(reason="Reviewed; evidence is adequate."), reviewer_request())
    assert get_audit(item_id)["events"][-1]["action"] == "Finding dismissed"
    items.pop(item_id, None); analyses.pop(analysis_id, None); audit.pop(item_id, None)


def test_demo_roles_cannot_record_decisions_unless_reviewer() -> None:
    client.post("/demo/reset")
    item = client.post("/items", json={"text": SAMPLE_AD}).json()
    analysis_id = client.post(f"/items/{item['id']}/analyze").json()["analysis_id"]
    finding_id = client.get(f"/analyses/{analysis_id}").json()["findings"][0]["id"]
    for role in ("Creator", "Manager"):
        headers = {"X-Demo-Role": role}
        assert client.post(f"/findings/{finding_id}/accept", headers=headers).status_code == 403
        assert client.post(f"/findings/{finding_id}/edit", json={"suggestion": "Edited copy"}, headers=headers).status_code == 403
        assert client.post(f"/findings/{finding_id}/dismiss", json={"reason": "Not applicable"}, headers=headers).status_code == 403
        assert client.post(f"/items/{item['id']}/comments", json={"comment": "Review note"}, headers=headers).status_code == 403
        assert client.post(f"/items/{item['id']}/status", json={"status": "In review"}, headers=headers).status_code == 403
    accepted = client.post(f"/findings/{finding_id}/accept", headers={"X-Demo-Role": "Reviewer"})
    assert accepted.status_code == 200
    client.post("/demo/reset")


def test_health_and_vercel_preflight() -> None:
    assert client.get("/health").json()["status"] == "ok"
    ready = client.get("/health/ready")
    assert ready.json()["status"] == "ready"
    assert ready.json()["db"] == "in-memory demo"
    assert client.get("/health").headers.get("x-request-id")
    response = client.options("/items", headers={
        "Origin": "https://brand-review-preview.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://brand-review-preview.vercel.app"


def test_oversized_request_is_rejected() -> None:
    response = client.post("/items", content=b"{}", headers={"content-length": "64001"})
    assert response.status_code == 413


def test_rate_limit_response_keeps_allowed_origin_headers() -> None:
    headers = cors_headers_for_origin("http://127.0.0.1:5178")
    assert headers["Access-Control-Allow-Origin"] == "http://127.0.0.1:5178"
    assert headers["Access-Control-Expose-Headers"] == "X-Request-ID"
    assert cors_headers_for_origin("http://127.0.0.1:5179")["Access-Control-Allow-Origin"] == "http://127.0.0.1:5179"
    assert cors_headers_for_origin("http://127.0.0.1:5180")["Access-Control-Allow-Origin"] == "http://127.0.0.1:5180"
    assert cors_headers_for_origin("http://127.0.0.1:5182")["Access-Control-Allow-Origin"] == "http://127.0.0.1:5182"
    assert cors_headers_for_origin("http://127.0.0.1:5183")["Access-Control-Allow-Origin"] == "http://127.0.0.1:5183"
    assert cors_headers_for_origin("https://untrusted.example") == {}


def test_sample_vertical_slice_reaches_approved_with_audit() -> None:
    client.post("/demo/reset")
    item = client.post("/items", json={"text": SAMPLE_AD}).json()
    analysis_id = client.post(f"/items/{item['id']}/analyze").json()["analysis_id"]
    analysis = client.get(f"/analyses/{analysis_id}").json()
    assert analysis["status"] == "complete"
    assert analysis["total_stages"] == 8
    assert len(analysis["findings"]) == 6
    assert analysis["cache_hit"] is False
    assert analysis["total_ms"] > 0
    assert len(analysis["timings_ms"]) == 8
    assert all(stage_ms > 0 for stage_ms in analysis["timings_ms"].values())
    repeat_item = client.post("/items", json={"text": SAMPLE_AD}).json()
    repeat_analysis_id = client.post(f"/items/{repeat_item['id']}/analyze").json()["analysis_id"]
    warm_analysis = client.get(f"/analyses/{repeat_analysis_id}").json()
    assert warm_analysis["cache_hit"] is True
    assert warm_analysis["total_ms"] > 0
    for index, finding in enumerate(analysis["findings"]):
        assert SAMPLE_AD[finding["span_start"]:finding["span_end"]] == finding["span_text"]
        if index == 0:
            response = client.post(f"/findings/{finding['id']}/accept")
        elif index == 1:
            response = client.post(f"/findings/{finding['id']}/edit", json={"suggestion": "Use a sourced statement."})
        elif index == 2:
            response = client.post(f"/findings/{finding['id']}/dismiss", json={"reason": "Reviewed against campaign evidence."})
        else:
            response = client.post(f"/findings/{finding['id']}/accept")
        assert response.status_code == 200
    client.post(f"/items/{item['id']}/comments", json={"comment": "Reviewed for this campaign."})
    approved = client.post(f"/items/{item['id']}/status", json={"status": "Approved"})
    assert approved.json()["status"] == "Approved"
    events = client.get(f"/items/{item['id']}/audit").json()["events"]
    verified = client.get(f"/items/{item['id']}/audit/verify").json()
    assert verified == {"ok": True, "checked": len(events), "broken_at": None}
    assert client.get(f"/items/{item['id']}").json()["id"] == item["id"]
    assert client.get(f"/items/{item['id']}/analysis").json()["id"] == analysis_id
    assert any(event["action"] == "Finding dismissed" and "Reviewed" in event["detail"] for event in events)
    assert any(event["action"] == "Comment added" for event in events)
    assert any(event["action"] == "Status changed" and event["detail"] == "Approved · v2" for event in events)
    # TestClient returns JSON copies; emulate an external database edit in the
    # backing store so the next endpoint call verifies the changed payload.
    audit[item["id"]][0]["detail"] = "tampered"
    assert client.get(f"/items/{item['id']}/audit/verify").json()["ok"] is False
    client.post("/demo/reset")
