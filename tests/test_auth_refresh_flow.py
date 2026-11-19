"""HTTP flow tests for session cookies (T-05/D-06).

Login/register set both HttpOnly cookies; `/auth/refresh` rotates from the
cookie (or the body for bearer clients); reuse revokes the family; logout
revokes and clears both cookies.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from src.adapters.http.dependencies import REFRESH_COOKIE, SESSION_COOKIE
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.application.usecases.auth import issue_session
from src.core.config import get_settings
from src.domain.user import new_user
from src.main import app

_EMAIL = "cookies@correo.com"
_PASSWORD = "correct-password"
_GENERIC_401 = "Token de actualización inválido o expirado."


def _add_user() -> None:
    app.state.repository.create_user(
        new_user(_EMAIL, BcryptPasswordHasher().hash(_PASSWORD), name="Cookie")
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient):
    _add_user()
    response = client.post(
        "/auth/login", json={"email": _EMAIL, "password": _PASSWORD}
    )
    assert response.status_code == 200
    return response


def _set_cookie_header(response, name: str) -> str:
    """Return the raw Set-Cookie header (value case must be preserved)."""
    for header in response.headers.get_list("set-cookie"):
        if header.split("=", 1)[0].lower() == name.lower():
            return header
    raise AssertionError(f"cookie {name!r} not set: {response.headers}")


def _refresh_cookie(response) -> str:
    # `response.cookies` filters by the request path; read the raw header so
    # the `Path=/auth` cookie is visible here too.
    header = _set_cookie_header(response, REFRESH_COOKIE)
    name_value = header.split(";", 1)[0]
    _, _, value = name_value.partition("=")
    assert value
    return value


def test_login_sets_both_httponly_cookies(client: TestClient) -> None:
    response = _login(client)

    access = _set_cookie_header(response, SESSION_COOKIE).lower()
    refresh = _set_cookie_header(response, REFRESH_COOKIE).lower()
    assert "httponly" in access and "path=/" in access
    assert "httponly" in refresh and "path=/auth" in refresh
    assert "samesite=lax" in access and "samesite=lax" in refresh


def test_register_sets_both_cookies(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "Ana", "email": "ana-cookie@correo.com", "password": "clave12345"},
    )

    assert response.status_code == 201
    assert _set_cookie_header(response, SESSION_COOKIE)
    assert _set_cookie_header(response, REFRESH_COOKIE)


def test_refresh_works_with_cookie_only(client: TestClient) -> None:
    old_refresh = _refresh_cookie(_login(client))

    response = client.post("/auth/refresh")

    assert response.status_code == 200
    new_refresh = _refresh_cookie(response)
    assert new_refresh != old_refresh
    assert "max-age=0" not in _set_cookie_header(response, REFRESH_COOKIE)
    assert client.get("/auth/me").status_code == 200


def test_refresh_still_works_with_body(client: TestClient) -> None:
    _add_user()
    user = app.state.repository.get_user_by_email(_EMAIL)
    assert user is not None
    pair = issue_session(user, app.state.refresh_repository, app.state.token_service)

    response = client.post(
        "/auth/refresh", json={"refresh_token": pair.refresh}
    )

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_refresh_without_token_is_401(client: TestClient) -> None:
    response = client.post("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == _GENERIC_401


def test_reusing_a_rotated_cookie_revokes_the_family(client: TestClient) -> None:
    old_refresh = _refresh_cookie(_login(client))
    rotated = client.post("/auth/refresh")
    new_refresh = _refresh_cookie(rotated)

    replay = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert replay.status_code == 401
    assert replay.json()["detail"] == _GENERIC_401

    # The whole family is burned, including the token issued a moment ago.
    after = client.post("/auth/refresh", json={"refresh_token": new_refresh})
    assert after.status_code == 401


def test_logout_revokes_family_and_clears_both_cookies(client: TestClient) -> None:
    refresh = _refresh_cookie(_login(client))

    response = client.post("/auth/logout")

    assert response.status_code == 204
    access_header = _set_cookie_header(response, SESSION_COOKIE).lower()
    refresh_header = _set_cookie_header(response, REFRESH_COOKIE).lower()
    assert "max-age=0" in access_header and "path=/" in access_header
    assert "max-age=0" in refresh_header and "path=/auth" in refresh_header
    assert client.post(
        "/auth/refresh", json={"refresh_token": refresh}
    ).status_code == 401
    assert client.get("/auth/me").status_code == 401


def test_access_token_is_rejected_as_refresh(client: TestClient) -> None:
    response = _login(client)
    access = str(response.cookies.get(SESSION_COOKIE))

    replay = client.post("/auth/refresh", json={"refresh_token": access})

    assert replay.status_code == 401


def test_cookie_secure_flag_is_configurable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("COOKIE_SECURE", "true")
    get_settings.cache_clear()

    response = _login(client)

    assert "secure" in _set_cookie_header(response, SESSION_COOKIE).lower()
    assert "secure" in _set_cookie_header(response, REFRESH_COOKIE).lower()
