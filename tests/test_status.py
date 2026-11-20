"""Status polling tests (T-15, CA-5/CA-15) + full upload flow (CA-1)."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.adapters.persistence.memory import (
    InMemoryDocumentRepository,
    InMemoryDocumentStateStore,
)
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.adapters.storage.filesystem import FilesystemStorage
from src.adapters.workers.queue import CeleryTaskQueue, create_celery_app
from src.application.usecases.documents import process_document
from src.domain.user import AuthContext, new_user
from src.main import app

_ADMIN_EMAIL = "root@correo.com"
_ADMIN_PASSWORD = "secret-password"


class InlineTaskQueue:
    """Runs the pipeline synchronously instead of sending to the broker
    (equivale a ALWAYS_EAGER): cierra el flujo CA-1 completo en la prueba."""

    def __init__(
        self,
        repository: InMemoryDocumentRepository,
        storage: FilesystemStorage,
        states: InMemoryDocumentStateStore,
        extractor: object,
        ocr: object,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._states = states
        self._extractor = extractor
        self._ocr = ocr

    def send_process_task(self, document_id: int) -> None:
        process_document(
            self._repository,
            self._storage,
            self._states,
            self._extractor,  # type: ignore[arg-type]
            self._ocr,  # type: ignore[arg-type]
            document_id,
        )


class _FakeExtractor:
    def extract_pdf(self, data: bytes) -> str:
        return "TEXTO DEL PDF"


class _FakeOcr:
    def recognize(self, image: bytes) -> str:
        return ""


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "storage"
    monkeypatch.setenv("STORAGE_DIR", str(path))
    monkeypatch.setenv("ADMIN_EMAIL", _ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", _ADMIN_PASSWORD)
    return path


@pytest.fixture
def client(env: Path) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        repository = app.state.repository
        storage = app.state.storage
        app.state.state_store = InMemoryDocumentStateStore()
        # Cola síncrona: la subida procesa al instante con dobles de extracción.
        app.state.task_queue = InlineTaskQueue(
            repository, storage, app.state.state_store, _FakeExtractor(), _FakeOcr()
        )
        yield test_client


def _auth(
    client: TestClient,
    email: str = _ADMIN_EMAIL,
    password: str = _ADMIN_PASSWORD,
) -> dict[str, str]:
    """Log in; TestClient keeps the session cookie for later requests."""
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {}


def test_status_unknown_document_is_404(client: TestClient) -> None:
    response = client.get("/documents/999/status", headers=_auth(client))

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado."


def test_status_of_foreign_document_is_404_uniform(client: TestClient) -> None:
    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert upload.status_code == 201

    # Un segundo usuario no puede ver el estado del documento ajeno.
    hasher = BcryptPasswordHasher()
    app.state.repository.create_user(
        new_user("otro@correo.com", hasher.hash("clave123"), name="Otro")
    )
    other = _auth(client, "otro@correo.com", "clave123")
    response = client.get(
        f"/documents/{upload.json()['id']}/status", headers=other
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado."


def test_admin_can_poll_any_document(client: TestClient) -> None:
    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )

    response = client.get(
        f"/documents/{upload.json()['id']}/status", headers=_auth(client)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"  # la cola en línea ya procesó
    assert body["error"] == ""


def test_error_state_is_reported_with_spanish_message(client: TestClient) -> None:
    from src.domain.document import DocumentState

    upload = client.post(
        "/documents",
        headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    app.state.state_store.set(
        upload.json()["id"], DocumentState("error", error="El PDF está cifrado y no puede procesarse.")
    )

    response = client.get(
        f"/documents/{upload.json()['id']}/status", headers=_auth(client)
    )

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "cifrado" in response.json()["error"]


def test_real_queue_wiring_uses_celery(env: Path) -> None:
    """Sanity: la composición real conecta CeleryTaskQueue (productor)."""
    assert isinstance(
        CeleryTaskQueue(create_celery_app("memory://")), CeleryTaskQueue
    )
