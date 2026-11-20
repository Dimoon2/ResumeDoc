"""Integration tests for `SQLModelRefreshTokenRepository` (D-06).

Automatically skipped without a real PostgreSQL. When
`INTEGRATION_DATABASE_URL` is set (or the `.env` `DATABASE_URL` is not
`memory://`), they run against that database and clean up their own rows.
"""

import os
import threading
import uuid
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, delete
from sqlmodel import Session, col

from db.models import TokenRefresco, User as OrmUser
from src.adapters.persistence.sqlmodel_refresh_repo import (
    SQLModelRefreshTokenRepository,
)
from src.adapters.persistence.sqlmodel_repo import SQLModelDocumentRepository
from src.core.config import get_settings
from src.domain.refresh_token import RefreshToken, new_refresh_token
from src.domain.user import new_user

try:
    _settings = get_settings()
except Exception:  # sin .env completo: queda en skip
    _settings = None

DB_URL = os.environ.get("INTEGRATION_DATABASE_URL", "") or (
    _settings.database_url if _settings else ""
)

pytestmark = pytest.mark.skipif(
    not DB_URL or DB_URL.startswith("memory://"),
    reason="BD de integración no disponible (define DATABASE_URL o INTEGRATION_DATABASE_URL)",
)

_NOW = datetime.now(timezone.utc)
_TTL = 600


def _new_family() -> str:
    return f"test-{uuid.uuid4().hex}"


def _family(created: list[str]) -> str:
    family = _new_family()
    created.append(family)
    return family


def _token(
    family: str,
    user_id: int,
    *,
    jti: str | None = None,
    now: datetime = _NOW,
    ttl: int = _TTL,
) -> RefreshToken:
    return new_refresh_token(
        user_id=user_id,
        family=family,
        ttl=ttl,
        now=now,
        jti=jti or uuid.uuid4().hex,
    )


@pytest.fixture(scope="module")
def user_id() -> Iterator[int]:
    """Real user so the `usuario_id` FK holds; deleting it cascades tokens."""
    repository = SQLModelDocumentRepository(DB_URL)
    email = f"refresh-{uuid.uuid4().hex}@correo.com"
    user = repository.create_user(new_user(email, "hash"))
    yield user.id
    engine = create_engine(DB_URL)
    with Session(engine) as session:
        session.execute(delete(OrmUser).where(col(OrmUser.correo) == email))
        session.commit()


@pytest.fixture
def families() -> Iterator[list[str]]:
    """Track created families and remove their rows after each test."""
    created: list[str] = []
    yield created
    if not created:
        return
    engine = create_engine(DB_URL)
    with Session(engine) as session:
        session.execute(
            delete(TokenRefresco).where(col(TokenRefresco.familia).in_(created))
        )
        session.commit()


@pytest.fixture
def repo() -> SQLModelRefreshTokenRepository:
    return SQLModelRefreshTokenRepository(DB_URL)


def test_create_and_get_roundtrip(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    token = _token(_family(families), user_id)
    repo.create(token)

    stored = repo.get(token.jti)

    assert stored == token
    assert stored is not None and stored.expires_at.tzinfo is not None


def test_get_unknown_returns_none(
    repo: SQLModelRefreshTokenRepository,
) -> None:
    assert repo.get(f"missing-{uuid.uuid4().hex}") is None


def test_duplicate_jti_is_rejected(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    token = _token(_family(families), user_id)
    repo.create(token)

    with pytest.raises(ValueError):
        repo.create(_token(token.family, user_id, jti=token.jti))


def test_claim_succeeds_only_once(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    token = _token(_family(families), user_id)
    repo.create(token)

    assert repo.claim(token.jti, _NOW) is True
    assert repo.claim(token.jti, _NOW) is False
    assert repo.claim(f"missing-{uuid.uuid4().hex}", _NOW) is False
    stored = repo.get(token.jti)
    assert stored is not None and stored.is_used()


def test_concurrent_claim_has_a_single_winner(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    token = _token(_family(families), user_id)
    repo.create(token)
    barrier = threading.Barrier(8)

    def attempt(_: int) -> bool:
        barrier.wait()
        return repo.claim(token.jti, _NOW)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(attempt, range(8)))

    assert results.count(True) == 1


def test_revoke_family_only_touches_its_family(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    revoked_family = _family(families)
    other_family = _family(families)
    first = _token(revoked_family, user_id)
    second = _token(other_family, user_id)
    repo.create(first)
    repo.create(second)

    repo.revoke_family(revoked_family, _NOW)

    stored_first = repo.get(first.jti)
    stored_second = repo.get(second.jti)
    assert stored_first is not None and stored_first.is_revoked()
    assert stored_second is not None and not stored_second.is_revoked()


def test_delete_expired_removes_only_expired(
    repo: SQLModelRefreshTokenRepository, user_id: int, families: list[str]
) -> None:
    expired = _token(
        _family(families),
        user_id,
        now=_NOW - timedelta(days=1),
        ttl=60,
    )
    alive = _token(_family(families), user_id)
    repo.create(expired)
    repo.create(alive)

    removed = repo.delete_expired(_NOW)

    assert removed >= 1
    assert repo.get(expired.jti) is None
    assert repo.get(alive.jti) is not None
