"""Summarization endpoint tests."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.adapters.persistence.memory import InMemoryDocumentStateStore
from src.application.ports.summarization import (
    SummaryResult,
    Summarizer,
    SynthesisDepth,
)
from src.domain.document import Document, DocumentState
from src.main import app
from test_status import (
    _ADMIN_EMAIL,
    _ADMIN_PASSWORD,
    _FakeExtractor,
    _FakeOcr,
    InlineTaskQueue,
)


class FakeSummarizer:
    """Doble de prueba del puerto Summarizer: no llama a ninguna API externa."""

    def summarize(self, text: str, depth: SynthesisDepth) -> SummaryResult:
        if not text or not text.strip():
            return SummaryResult(
                executive_summary="",
                key_points=[],
                action_items=[
                    {
                        "owner": "Usuario",
                        "task": "No se pudo extraer contenido resumible del documento.",
                        "priority": "Baja",
                    }
                ],
                topics=[],
                word_count_original=0,
                word_count_summary=0,
                reading_time_minutes=0,
                source_excerpt=text[:4000],
            )

        prefix = {"executive": "", "detailed": "", "bullets": "• "}[depth]
        summary = f"{prefix}{text[:200]}"
        return SummaryResult(
            executive_summary=summary,
            key_points=[summary],
            action_items=[
                {
                    "owner": "Usuario",
                    "task": "Revisar el resumen generado y validar los hallazgos.",
                    "priority": "Media",
                }
            ],
            topics=["resumen"],
            word_count_original=len(text.split()),
            word_count_summary=len(summary.split()),
            reading_time_minutes=max(1, round(len(summary.split()) / 150)),
            source_excerpt=text[:4000],
        )


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "storage"
    monkeypatch.setenv("STORAGE_DIR", str(path))
    monkeypatch.setenv("ADMIN_EMAIL", _ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", _ADMIN_PASSWORD)
    return path


@pytest.fixture
def client(env: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        repository = app.state.repository
        storage = app.state.storage
        app.state.state_store = InMemoryDocumentStateStore()
        app.state.task_queue = InlineTaskQueue(
            repository, storage, app.state.state_store, _FakeExtractor(), _FakeOcr()
        )
        app.state.summarizer = FakeSummarizer()
        yield test_client


def _auth(
    client: TestClient,
    email: str = _ADMIN_EMAIL,
    password: str = _ADMIN_PASSWORD,
) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {}


def test_summary_requires_completed_document(client: TestClient) -> None:
    """Sin estado completado → 409."""
    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    # Forzar estado pending (sin texto).
    app.state.state_store.set(document_id, DocumentState("pending"))

    response = client.post(
        f"/documents/{document_id}/summary",
        headers=_auth(client),
        json={"depth": "executive"},
    )
    assert response.status_code == 409
    assert "no tiene texto extraído" in response.json()["detail"]


def test_summary_unknown_document_is_404(client: TestClient) -> None:
    response = client.post(
        "/documents/999/summary",
        headers=_auth(client),
        json={"depth": "executive"},
    )
    assert response.status_code == 404


def test_summary_generates_for_completed_document(client: TestClient) -> None:
    """Flujo completo: subir → procesado → resumen."""
    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    # El estado ya es completed gracias a la cola en línea (_FakeExtractor).
    response = client.post(
        f"/documents/{document_id}/summary",
        headers=_auth(client),
        json={"depth": "executive"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == f"summary-{document_id}"
    assert body["executive_summary"].startswith("TEXTO DEL PDF")
    assert body["word_count_original"] > 0
    assert body["reading_time_minutes"] >= 1
    assert isinstance(body["key_points"], list)
    assert isinstance(body["topics"], list)


def test_summary_foreign_document_is_404(client: TestClient) -> None:
    from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
    from src.domain.user import new_user

    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    hasher = BcryptPasswordHasher()
    app.state.repository.create_user(
        new_user("otro@correo.com", hasher.hash("clave123"), name="Otro")
    )
    other_user = _auth(client, "otro@correo.com", "clave123")
    response = client.post(
        f"/documents/{document_id}/summary",
        headers=other_user,
        json={"depth": "executive"},
    )
    assert response.status_code == 404


def test_summary_bullets_depth(client: TestClient) -> None:
    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    response = client.post(
        f"/documents/{document_id}/summary",
        headers=_auth(client),
        json={"depth": "bullets"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["executive_summary"].startswith("•")


def test_summary_empty_text(client: TestClient) -> None:
    """Documento completado con texto vacío → resumen vacío, no falla."""
    from src.adapters.persistence.memory import InMemoryDocumentRepository

    repo: InMemoryDocumentRepository = app.state.repository  # type: ignore[assignment]
    document = repo.create_document(
        Document(name="vacio.pdf", location="vacio.pdf", size_bytes=0, owner_id=1)
    )
    app.state.state_store.set(document.id, DocumentState("completed", text_path=""))

    response = client.post(
        f"/documents/{document.id}/summary",
        headers=_auth(client),
        json={"depth": "executive"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["executive_summary"] == ""
    assert body["word_count_original"] == 0
