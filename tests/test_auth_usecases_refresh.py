"""Use-case tests for refresh rotation (D-06): issue, rotate, reuse, logout."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import pytest

from src.adapters.persistence.memory import (
    InMemoryDocumentRepository,
    InMemoryRefreshTokenRepository,
)
from src.adapters.security.jwt_adapter import JwtTokenService
from src.application.usecases.auth import (
    issue_session,
    login,
    logout_session,
    rotate_session,
)
from src.domain.refresh_token import (
    ExpiredRefreshToken,
    InvalidRefreshToken,
    ReusedRefreshToken,
    RevokedRefreshToken,
    new_family,
    new_refresh_token,
)
from src.domain.user import User as DomainUser, new_user

_SECRET = "test-secret-that-is-long-enough-32-bytes!"
_TTL = 600


class _Hasher:
    """Fast stand-in for bcrypt in use-case tests."""

    def hash(self, password: str) -> str:
        return f"hash:{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == f"hash:{password}"


class _RaceRepository(InMemoryRefreshTokenRepository):
    """Simulates losing the atomic claim race against another rotation."""

    def claim(self, jti: str, now: datetime) -> bool:
        return False


@dataclass(frozen=True)
class _Env:
    tokens: JwtTokenService
    users: InMemoryDocumentRepository
    user: DomainUser
    refresh: InMemoryRefreshTokenRepository


def _setup(
    refresh: InMemoryRefreshTokenRepository | None = None,
    password_hash: str = "hash",
) -> _Env:
    tokens = JwtTokenService(
        secret=_SECRET, access_ttl=60, refresh_ttl=_TTL
    )
    users = InMemoryDocumentRepository()
    user = users.create_user(
        new_user("alice@correo.com", password_hash, name="Alice")
    )
    return _Env(
        tokens=tokens,
        users=users,
        user=user,
        refresh=refresh or InMemoryRefreshTokenRepository(),
    )


def test_issue_session_persists_and_signs_the_pair() -> None:
    env = _setup()
    now = datetime.now(timezone.utc)

    pair = issue_session(env.user, env.refresh, env.tokens, now=now)

    claims = env.tokens.decode_refresh_token(pair.refresh)
    assert claims is not None
    assert claims.user_id == env.user.id
    stored = env.refresh.get(claims.jti)
    assert stored is not None
    assert stored.family == claims.family
    assert stored.expires_at == now + timedelta(seconds=_TTL)
    assert env.tokens.decode_access_token(pair.access) is not None


def test_rotate_issues_new_jti_same_family_and_same_expiry() -> None:
    env = _setup()
    now = datetime.now(timezone.utc)
    first = issue_session(env.user, env.refresh, env.tokens, now=now)
    first_claims = env.tokens.decode_refresh_token(first.refresh)
    assert first_claims is not None
    first_stored = env.refresh.get(first_claims.jti)
    assert first_stored is not None

    user, second = rotate_session(
        env.refresh, env.users, env.tokens, first.refresh, now=now
    )

    second_claims = env.tokens.decode_refresh_token(second.refresh)
    assert second_claims is not None
    assert user.id == env.user.id
    assert second_claims.jti != first_claims.jti
    assert second_claims.family == first_claims.family
    second_stored = env.refresh.get(second_claims.jti)
    assert second_stored is not None
    assert second_stored.expires_at == first_stored.expires_at
    first_after = env.refresh.get(first_claims.jti)
    assert first_after is not None and first_after.is_used()


def test_reusing_a_consumed_token_revokes_the_family() -> None:
    env = _setup()
    now = datetime.now(timezone.utc)
    first = issue_session(env.user, env.refresh, env.tokens, now=now)
    _user, second = rotate_session(
        env.refresh, env.users, env.tokens, first.refresh, now=now
    )
    second_claims = env.tokens.decode_refresh_token(second.refresh)
    assert second_claims is not None

    with pytest.raises(ReusedRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, first.refresh, now=now)

    second_stored = env.refresh.get(second_claims.jti)
    assert second_stored is not None and second_stored.is_revoked()


def test_losing_the_claim_race_counts_as_reuse() -> None:
    env = _setup(refresh=_RaceRepository())
    now = datetime.now(timezone.utc)
    pair = issue_session(env.user, env.refresh, env.tokens, now=now)
    claims = env.tokens.decode_refresh_token(pair.refresh)
    assert claims is not None

    with pytest.raises(ReusedRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, pair.refresh, now=now)

    stored = env.refresh.get(claims.jti)
    assert stored is not None and stored.is_revoked()


def test_revoked_token_is_rejected() -> None:
    env = _setup()
    pair = issue_session(env.user, env.refresh, env.tokens)
    logout_session(env.refresh, env.tokens, pair.refresh)

    with pytest.raises(RevokedRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, pair.refresh)


def test_expired_token_is_rejected() -> None:
    env = _setup()
    now = datetime.now(timezone.utc)
    family = new_family()
    expired = new_refresh_token(
        user_id=env.user.id,
        family=family,
        ttl=5,
        now=now - timedelta(seconds=10),
    )
    env.refresh.create(expired)
    # The JWT itself is still valid; the stored row is the expired one.
    raw = env.tokens.create_refresh_token(
        env.user, expired.jti, family, ttl=_TTL
    )

    with pytest.raises(ExpiredRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, raw, now=now)


def test_garbage_token_is_invalid() -> None:
    env = _setup()

    with pytest.raises(InvalidRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, "not-a-jwt")


def test_unknown_jti_is_invalid() -> None:
    env = _setup()
    family = new_family()
    raw = env.tokens.create_refresh_token(env.user, "unknown-jti", family)

    with pytest.raises(InvalidRefreshToken):
        rotate_session(env.refresh, env.users, env.tokens, raw)


def test_logout_is_idempotent_and_silent_without_token() -> None:
    env = _setup()
    pair = issue_session(env.user, env.refresh, env.tokens)
    claims = env.tokens.decode_refresh_token(pair.refresh)
    assert claims is not None

    logout_session(env.refresh, env.tokens, pair.refresh)
    logout_session(env.refresh, env.tokens, pair.refresh)
    logout_session(env.refresh, env.tokens, None)
    logout_session(env.refresh, env.tokens, "not-a-jwt")

    stored = env.refresh.get(claims.jti)
    assert stored is not None and stored.is_revoked()


def test_login_returns_session_only_for_valid_credentials() -> None:
    hasher = _Hasher()
    password = "correct-password"
    env = _setup(password_hash=hasher.hash(password))

    wrong = login(
        env.users, hasher, env.tokens, env.refresh, "alice@correo.com", "wrong"
    )
    assert wrong is None

    session = login(
        env.users,
        hasher,
        env.tokens,
        env.refresh,
        "alice@correo.com",
        password,
    )
    assert session is not None
    user, pair = session
    assert user.id == env.user.id
    assert env.tokens.decode_refresh_token(pair.refresh) is not None
