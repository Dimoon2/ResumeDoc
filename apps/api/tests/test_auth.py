"""Authentication tests (T-05, CA-11): login, refresh, 401, expiration."""

from collections.abc import Iterator

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.adapters.http.dependencies import current_user
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.adapters.security.jwt_adapter import JwtTokenService
from src.domain.user import AuthContext, Role, User, new_user
from src.main import app

_SECRET = "test-secret-that-is-long-enough-32-bytes!"


def _tokens(access_ttl: int = 60, refresh_ttl: int = 600) -> JwtTokenService:
    return JwtTokenService(
        secret=_SECRET, access_ttl=access_ttl, refresh_ttl=refresh_ttl
    )


def _add_user(
    client: TestClient, email: str, password: str, role: Role = "user"
) -> None:
    hasher = BcryptPasswordHasher()
    app.state.repository.create_user(
        new_user(email, hasher.hash(password), role=role)
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Run the real composition (adapters wired in the lifespan)."""
    with TestClient(app) as test_client:
        yield test_client


# --- Login (contrato del frontend) -------------------------------------


def test_login_returns_user_and_session_cookie(client: TestClient) -> None:
    _add_user(client, "alice@correo.com", "correct-password")
    response = client.post(
        "/auth/login",
        json={"email": "alice@correo.com", "password": "correct-password"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "alice@correo.com"
    assert body["user"]["id"] > 0
    context = app.state.token_service.decode_access_token(
        client.cookies["access_token"]
    )
    assert context is not None
    assert context.email == "alice@correo.com"
    assert context.role == "user"


def test_login_wrong_password_is_401_in_spanish(client: TestClient) -> None:
    _add_user(client, "alice", "correct-password")
    response = client.post(
        "/auth/login", json={"email": "alice", "password": "wrong"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales incorrectas."


def test_login_unknown_user_is_401(client: TestClient) -> None:
    response = client.post(
        "/auth/login", json={"email": "nobody", "password": "x"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales incorrectas."


# --- Refresh (flujo bearer, para clientes sin cookies) ------------------


def test_refresh_returns_new_access_token(client: TestClient) -> None:
    _add_user(client, "alice@correo.com", "correct-password")
    user = app.state.repository.get_user_by_email("alice@correo.com")
    assert user is not None
    refresh_token = app.state.token_service.create_refresh_token(user)

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    context = app.state.token_service.decode_access_token(
        response.json()["access_token"]
    )
    assert context is not None
    assert context.email == "alice@correo.com"


def test_refresh_rejects_access_token(client: TestClient) -> None:
    _add_user(client, "alice@correo.com", "correct-password")
    user = app.state.repository.get_user_by_email("alice@correo.com")
    assert user is not None
    access_token = app.state.token_service.create_access_token(user)

    response = client.post("/auth/refresh", json={"refresh_token": access_token})

    assert response.status_code == 401
    assert response.json()["detail"] == "Token de actualización inválido o expirado."


# --- Registro propio (D-28) ---------------------------------------------


def test_register_creates_user_and_logs_in(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "Ana Pérez", "email": "ana@correo.com", "password": "clave12345"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"] == {
        "id": body["user"]["id"],
        "name": "Ana Pérez",
        "email": "ana@correo.com",
    }
    context = app.state.token_service.decode_access_token(
        client.cookies["access_token"]
    )
    assert context is not None and context.role == "user"
    stored = app.state.repository.get_user_by_email("ana@correo.com")
    assert stored is not None and stored.name == "Ana Pérez"


def test_register_duplicate_email_is_409_in_spanish(client: TestClient) -> None:
    payload = {"name": "Ana", "email": "ana@correo.com", "password": "clave12345"}
    assert client.post("/auth/register", json=payload).status_code == 201

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "Ya existe una cuenta con ese correo."


def test_register_validations_are_in_spanish(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "  ", "email": "no-es-correo", "password": "corta"},
    )

    assert response.status_code == 422
    messages = str(response.json()["detail"])
    assert "nombre" in messages
    assert "correo válido" in messages
    assert "8 caracteres" in messages


# --- GET /auth/me + logout (sesión por cookie) ---------------------------


def test_me_returns_current_user_from_cookie(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"name": "Ana", "email": "ana@correo.com", "password": "clave12345"},
    )

    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "ana@correo.com"


def test_me_without_cookie_is_401(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_forgot_password_always_202_and_generic(client: TestClient) -> None:
    generic = "Si el correo está asociado a una cuenta, recibirás instrucciones."

    known = client.post("/auth/forgot-password", json={"email": "ana@correo.com"})
    unknown = client.post(
        "/auth/forgot-password", json={"email": "nadie@correo.com"}
    )

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json() == {"detail": generic}


def test_forgot_password_rejects_invalid_email(client: TestClient) -> None:
    response = client.post("/auth/forgot-password", json={"email": "no-es-correo"})

    assert response.status_code == 422
    assert "correo válido" in response.json()["detail"][0]["msg"] or "correo válido" in str(
        response.json()["detail"]
    )


def test_logout_clears_the_cookie(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"name": "Ana", "email": "ana@correo.com", "password": "clave12345"},
    )
    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert client.get("/auth/me").status_code == 401


# --- current_user dependency -------------------------------------------


def _probe_app(tokens: JwtTokenService) -> FastAPI:
    """Minimal app that exposes a protected route for dependency tests."""
    probe = FastAPI()
    probe.state.token_service = tokens

    @probe.get("/me")
    def me(user: AuthContext = Depends(current_user)) -> dict[str, str | int]:
        return {"user_id": user.user_id, "email": user.email, "role": user.role}

    return probe


def test_current_user_resolves_identity() -> None:
    user: User = new_user("alice", "hash", role="user")
    probe = _probe_app(_tokens())
    token = probe.state.token_service.create_access_token(user)

    with TestClient(probe) as test_client:
        response = test_client.get(
            "/me", headers={"Authorization": f"Bearer {token}"}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == user.id
    assert body["email"] == "alice"
    assert body["role"] == "user"


def test_current_user_without_token_is_401() -> None:
    probe = _probe_app(_tokens())

    with TestClient(probe) as test_client:
        response = test_client.get("/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Token de autenticación ausente o inválido."


def test_current_user_with_garbage_token_is_401() -> None:
    probe = _probe_app(_tokens())

    with TestClient(probe) as test_client:
        response = test_client.get(
            "/me", headers={"Authorization": "Bearer not-a-jwt"}
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token de autenticación ausente o inválido."


def test_current_user_rejects_refresh_token_as_access() -> None:
    user: User = new_user("alice", "hash", role="user")
    tokens = _tokens()
    probe = _probe_app(tokens)
    refresh = tokens.create_refresh_token(user)

    with TestClient(probe) as test_client:
        response = test_client.get(
            "/me", headers={"Authorization": f"Bearer {refresh}"}
        )

    assert response.status_code == 401


def test_expired_access_token_is_401() -> None:
    user: User = new_user("alice", "hash", role="user")
    expired = _tokens(access_ttl=-1)
    probe = _probe_app(_tokens())  # decoder is a different (valid) instance
    token = expired.create_access_token(user)

    with TestClient(probe) as test_client:
        response = test_client.get(
            "/me", headers={"Authorization": f"Bearer {token}"}
        )

    assert response.status_code == 401
