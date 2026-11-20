"""Upload tests (T-10, CA-1/CA-2): validation, storage and immediate response."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.adapters.workers.memory import EagerTaskQueue
from src.main import app

_ADMIN_EMAIL = "root@correo.com"
_ADMIN_PASSWORD = "secret-password"


@pytest.fixture
def storage_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect STORAGE_DIR to a temp directory for this test."""
    path = tmp_path / "storage"
    monkeypatch.setenv("STORAGE_DIR", str(path))
    return path


@pytest.fixture
def client(
    storage_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> Iterator[TestClient]:
    """Run the real composition with an admin bootstrapped for login, the
    task queue swapped for the eager double (no real broker in tests)."""
    monkeypatch.setenv("ADMIN_EMAIL", _ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", _ADMIN_PASSWORD)
    with TestClient(app) as test_client:
        app.state.task_queue = EagerTaskQueue()
        yield test_client


def _auth(client: TestClient) -> dict[str, str]:
    """Log in: TestClient keeps the session cookie for later requests."""
    response = client.post(
        "/auth/login",
        json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return {}


def test_upload_valid_pdf_creates_file_and_record(
    storage_dir: Path, client: TestClient
) -> None:
    content = b"%PDF-1.4 contenido de prueba"
    response = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", content, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["status"] == "pending"

    stored = list(storage_dir.iterdir())
    assert len(stored) == 1 and stored[0].suffix == ".pdf"
    document = app.state.repository.get_document(body["id"])
    assert document is not None
    assert document.name == "informe.pdf"
    assert document.size_bytes == len(content)
    assert document.owner_id == 1  # el admin del bootstrap
    assert document.location == stored[0].name


def test_upload_enqueues_processing(client: TestClient) -> None:
    queue = app.state.task_queue
    assert isinstance(queue, EagerTaskQueue)
    response = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 201
    assert queue.sent == [response.json()["id"]]


@pytest.mark.parametrize("extension", ["pdf", "png", "jpg", "jpeg"])
def test_upload_accepts_allowed_extensions(
    storage_dir: Path, client: TestClient, extension: str
) -> None:
    response = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": (f"doc.{extension}", b"data", "application/octet-stream")},
    )

    assert response.status_code == 201
    assert len(list(storage_dir.iterdir())) == 1


@pytest.mark.parametrize("filename", ["tarea.docx", "anim.gif", "virus.exe"])
def test_upload_rejects_unsupported_extension(
    storage_dir: Path, client: TestClient, filename: str
) -> None:
    response = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": (filename, b"data", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "no soportado" in response.json()["detail"]
    assert list(storage_dir.iterdir()) == []
    assert app.state.repository.get_document(1) is None


def test_upload_rejects_empty_file(
    storage_dir: Path, client: TestClient
) -> None:
    response = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("vacio.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    assert "vacío" in response.json()["detail"]
    assert list(storage_dir.iterdir()) == []
    assert app.state.repository.get_document(1) is None


def test_upload_rejects_oversize_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # El límite se lee al arrancar la app: parchear ANTES del TestClient.
    storage_dir = tmp_path / "storage"
    monkeypatch.setenv("STORAGE_DIR", str(storage_dir))
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    monkeypatch.setenv("ADMIN_EMAIL", _ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", _ADMIN_PASSWORD)
    content = b"x" * (1024 * 1024 + 1)

    with TestClient(app) as client:
        app.state.task_queue = EagerTaskQueue()
        response = client.post(
            "/documents",
            headers=_auth(client),
            files={"file": ("grande.pdf", content, "application/pdf")},
        )

    assert response.status_code == 413
    assert "límite de 1 MB" in response.json()["detail"]
    assert list(storage_dir.iterdir()) == []
    assert app.state.repository.get_document(1) is None


def test_upload_without_token_is_401(client: TestClient) -> None:
    response = client.post(
        "/documents",
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token de autenticación ausente o inválido."


def test_enqueue_failure_compensates(
    storage_dir: Path, client: TestClient
) -> None:
    """Broker caído tras crear el registro: sin huérfanos en BD ni disco,
    y el error se relanza al cliente (el HTTP adapter lo convierte en 500)."""

    class BrokenQueue:
        def send_process_task(self, document_id: int) -> None:
            raise ConnectionError("broker caído")

    app.state.task_queue = BrokenQueue()
    with pytest.raises(ConnectionError):
        client.post(
            "/documents",
            headers=_auth(client),
            files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
        )

    assert list(storage_dir.iterdir()) == []
    assert app.state.repository.get_document(1) is None
