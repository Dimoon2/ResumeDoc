"""CRUD endpoints of documents: list, detail, text, rename, delete."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.adapters.persistence.memory import InMemoryDocumentStateStore
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.domain.document import Document
from src.domain.user import new_user
from src.main import app
from test_status import (
    _ADMIN_EMAIL,
    _ADMIN_PASSWORD,
    _FakeExtractor,
    _FakeOcr,
    InlineTaskQueue,
)


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "storage"
    monkeypatch.setenv("STORAGE_DIR", str(path))
    return path


@pytest.fixture
def client(env: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("ADMIN_EMAIL", _ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", _ADMIN_PASSWORD)
    with TestClient(app) as test_client:
        repository = app.state.repository
        storage = app.state.storage
        app.state.state_store = InMemoryDocumentStateStore()
        app.state.task_queue = InlineTaskQueue(
            repository, storage, app.state.state_store, _FakeExtractor(), _FakeOcr()
        )
        yield test_client


def _auth(
    client: TestClient,
    email: str = _ADMIN_EMAIL,
    password: str = _ADMIN_PASSWORD,
) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {}


def _second_user(client: TestClient) -> dict[str, str]:
    hasher = BcryptPasswordHasher()
    app.state.repository.create_user(
        new_user("otro@correo.com", hasher.hash("clave123"), name="Otro")
    )
    return _auth(client, "otro@correo.com", "clave123")


def test_list_returns_own_documents_only(client: TestClient) -> None:
    for name in ("uno.pdf", "dos.pdf"):
        upload = client.post(
            "/documents", headers=_auth(client),
            files={"file": (name, b"%PDF-1.4", "application/pdf")},
        )
        assert upload.status_code == 201

    other = _second_user(client)
    client.post(
        "/documents", headers=other,
        files={"file": ("suyo.pdf", b"%PDF-1.4", "application/pdf")},
    )

    mine = client.get("/documents", headers=other)
    assert mine.status_code == 200
    assert [doc["name"] for doc in mine.json()] == ["suyo.pdf"]

    every = client.get("/documents", headers=_auth(client))
    assert every.status_code == 200
    assert sorted(doc["name"] for doc in every.json()) == ["dos.pdf", "suyo.pdf", "uno.pdf"]


def test_document_detail_and_foreign_404(client: TestClient) -> None:
    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    detail = client.get(f"/documents/{document_id}", headers=_auth(client))
    assert detail.status_code == 200
    body = detail.json()
    assert body["name"] == "informe.pdf"
    assert body["status"] == "completed"  # la cola en línea ya procesó
    assert body["size_bytes"] == len(b"%PDF-1.4")

    other = _second_user(client)
    foreign = client.get(f"/documents/{document_id}", headers=other)
    assert foreign.status_code == 404


def test_text_only_when_completed(client: TestClient) -> None:
    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("informe.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    text = client.get(f"/documents/{document_id}/text", headers=_auth(client))
    assert text.status_code == 200
    assert text.text == "TEXTO DEL PDF"

    # Un documento sin estado (nunca encolado) → pending → 409.
    orphan = app.state.repository.create_document(
        Document(name="pendiente.pdf", location="x.pdf", size_bytes=1, owner_id=1)
    )
    not_ready = client.get(f"/documents/{orphan.id}/text", headers=_auth(client))
    assert not_ready.status_code == 409
    assert not_ready.json()["detail"] == "El texto todavía no está disponible."

    other = _second_user(client)
    foreign = client.get(f"/documents/{document_id}/text", headers=other)
    assert foreign.status_code == 404


def test_rename_document(client: TestClient) -> None:
    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("viejo.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    renamed = client.patch(
        f"/documents/{document_id}", headers=_auth(client), json={"name": "  Nuevo nombre.pdf "}
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Nuevo nombre.pdf"

    detail = client.get(f"/documents/{document_id}", headers=_auth(client))
    assert detail.json()["name"] == "Nuevo nombre.pdf"

    empty = client.patch(
        f"/documents/{document_id}", headers=_auth(client), json={"name": "   "}
    )
    assert empty.status_code == 422


def test_delete_processing_is_409(client: TestClient) -> None:
    from src.domain.document import DocumentState

    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("enproceso.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]
    app.state.state_store.set(document_id, DocumentState("processing"))

    deleted = client.delete(f"/documents/{document_id}", headers=_auth(client))
    assert deleted.status_code == 409
    assert "procesamiento" in deleted.json()["detail"]
    # El documento sigue existiendo y su binario intacto.
    assert client.get(f"/documents/{document_id}", headers=_auth(client)).status_code == 200


def test_put_text_overwrites_original(client: TestClient) -> None:
    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("editable.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]

    edited = client.put(
        f"/documents/{document_id}/text", headers=_auth(client), json={"text": "texto editado por el usuario"}
    )
    assert edited.status_code == 204

    text = client.get(f"/documents/{document_id}/text", headers=_auth(client))
    assert text.status_code == 200
    assert text.text == "texto editado por el usuario"

    # La segunda edición vuelve a sobreescribir el mismo archivo.
    client.put(
        f"/documents/{document_id}/text", headers=_auth(client), json={"text": "segunda edición"}
    )
    assert client.get(f"/documents/{document_id}/text", headers=_auth(client)).text == "segunda edición"

    # Sin estado (pending) → 409; documento ajeno → 404.
    orphan = app.state.repository.create_document(
        Document(name="p.pdf", location="x.pdf", size_bytes=1, owner_id=1)
    )
    pending = client.put(
        f"/documents/{orphan.id}/text", headers=_auth(client), json={"text": "x"}
    )
    assert pending.status_code == 409

    other = _second_user(client)
    foreign = client.put(
        f"/documents/{document_id}/text", headers=other, json={"text": "x"}
    )
    assert foreign.status_code == 404


def test_put_text_on_empty_completed_creates_file(client: TestClient) -> None:
    from src.domain.document import DocumentState

    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("vacio.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]
    # D-09: pipeline completado con texto vacío → text_path "".
    app.state.state_store.set(document_id, DocumentState("completed"))

    edited = client.put(
        f"/documents/{document_id}/text", headers=_auth(client), json={"text": "primera edición"}
    )
    assert edited.status_code == 204

    text = client.get(f"/documents/{document_id}/text", headers=_auth(client))
    assert text.status_code == 200
    assert text.text == "primera edición"
    assert app.state.state_store.get(document_id).text_path != ""  # type: ignore[union-attr]


def test_delete_removes_record_file_and_state(client: TestClient) -> None:
    upload = client.post(
        "/documents", headers=_auth(client),
        files={"file": ("borrable.pdf", b"%PDF-1.4", "application/pdf")},
    )
    document_id = upload.json()["id"]
    location = app.state.repository.get_document(document_id).location  # type: ignore[union-attr]

    deleted = client.delete(f"/documents/{document_id}", headers=_auth(client))
    assert deleted.status_code == 204

    assert client.get(f"/documents/{document_id}", headers=_auth(client)).status_code == 404
    assert client.get(f"/documents/{document_id}/status", headers=_auth(client)).status_code == 404
    assert app.state.state_store.get(document_id) is None
    storage = app.state.storage
    with pytest.raises(FileNotFoundError):
        storage.read(location)

    other = _second_user(client)
    foreign = client.delete(f"/documents/{document_id}", headers=other)
    assert foreign.status_code == 404
