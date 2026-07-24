from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from arc_api.demo import demo_events


def headers(token: str) -> dict[str, str]:
    return {"x-internal-token": token}


def test_platform_endpoints_are_public(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").status_code == 200
    assert client.get("/version").json()["version"] == "0.1.0"


def test_internal_endpoints_require_token(client: TestClient) -> None:
    response = client.post("/internal/generate-demo-events")

    assert response.status_code == 401
    assert response.json()["detail"] == "Internal token is invalid."


def test_process_event_returns_validation_result_without_server_config(
    client: TestClient,
    internal_token: str,
) -> None:
    response = client.post(
        "/internal/process-event",
        headers=headers(internal_token),
        json={
            "raw_event_id": str(uuid4()),
            "provider": "custom",
            "payload": demo_events()["custom"],
        },
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "validation_only"
    assert response.json()["canonical_event"]["run_status"] == "succeeded"


def test_invalid_provider_payload_has_structured_error(
    client: TestClient,
    internal_token: str,
) -> None:
    response = client.post(
        "/internal/process-event",
        headers=headers(internal_token),
        json={
            "raw_event_id": str(uuid4()),
            "provider": "custom",
            "payload": {"status": "succeeded"},
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_provider_payload"


def test_incident_endpoint(client: TestClient, internal_token: str) -> None:
    response = client.post(
        "/internal/recalculate-incident",
        headers=headers(internal_token),
        json={
            "workflow_name": "Synthetic Workflow",
            "status": "failed",
            "error": {"code": "DEMO", "message": "Synthetic failure"},
        },
    )

    assert response.status_code == 200
    assert response.json()["create"] is True
    assert response.json()["severity"] == "medium"


def test_demo_events_include_all_adapters(
    client: TestClient,
    internal_token: str,
) -> None:
    response = client.post(
        "/internal/generate-demo-events",
        headers=headers(internal_token),
    )

    assert response.status_code == 200
    assert set(response.json()) == {"custom", "n8n", "make", "zapier"}


def test_correlation_id_is_returned(client: TestClient) -> None:
    supplied = "11111111-1111-4111-8111-111111111111"
    response = client.get("/health", headers={"x-correlation-id": supplied})

    assert response.headers["x-correlation-id"] == supplied
