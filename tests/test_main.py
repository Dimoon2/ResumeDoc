"""Smoke tests of the hexagonal skeleton (T-01)."""

from fastapi.testclient import TestClient

from src.main import app


def test_health_endpoint_responds() -> None:
    """The composition boots and the HTTP adapter answers."""
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["message"] == "Servicio en funcionamiento."


def test_openapi_schema_is_generated() -> None:
    """FastAPI builds its schema, proving the app is well-formed."""
    schema = app.openapi()
    assert "/health" in schema["paths"]
