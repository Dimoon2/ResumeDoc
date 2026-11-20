"""Tests of the first-admin bootstrap (T-04b, CA-13)."""

from fastapi.testclient import TestClient

from src.adapters.persistence.memory import InMemoryDocumentRepository
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.application.usecases.auth import bootstrap_admin
from src.main import app


def test_bootstrap_creates_first_admin_once() -> None:
    repository = InMemoryDocumentRepository()
    hasher = BcryptPasswordHasher()

    bootstrap_admin(repository, hasher, "root@correo.com", "secret-password")
    bootstrap_admin(repository, hasher, "root@correo.com", "other-password")

    admin = repository.get_user_by_email("root@correo.com")
    assert admin is not None
    assert admin.role == "admin"
    assert hasher.verify("secret-password", admin.password_hash)


def test_bootstrap_skipped_without_credentials() -> None:
    repository = InMemoryDocumentRepository()

    bootstrap_admin(repository, BcryptPasswordHasher(), "", "")

    assert repository.get_user_by_email("") is None
    assert repository.get_user_by_email("root@correo.com") is None


def test_admin_created_by_bootstrap_can_login(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_EMAIL", "root@correo.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "secret-password")

    with TestClient(app) as client:
        response = client.post(
            "/auth/login",
            json={"email": "root@correo.com", "password": "secret-password"},
        )

    assert response.status_code == 200
    context = app.state.token_service.decode_access_token(
        client.cookies["access_token"]
    )
    assert context is not None
    assert context.role == "admin"
