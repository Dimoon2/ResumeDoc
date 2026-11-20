"""Unit tests for the in-memory refresh-token repository (D-06)."""

from datetime import datetime, timedelta, timezone

import pytest

from src.adapters.persistence.memory import InMemoryRefreshTokenRepository
from src.domain.refresh_token import RefreshToken, new_refresh_token

_NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)
_TTL = 600


def _token(
    jti: str = "jti-1", family: str = "fam-1", user_id: int = 1
) -> RefreshToken:
    return new_refresh_token(
        user_id=user_id, family=family, ttl=_TTL, now=_NOW, jti=jti
    )


def _get(repo: InMemoryRefreshTokenRepository, jti: str) -> RefreshToken:
    token = repo.get(jti)
    assert token is not None
    return token


def test_create_and_get_roundtrip() -> None:
    repo = InMemoryRefreshTokenRepository()
    token = _token()
    repo.create(token)

    assert repo.get("jti-1") == token
    assert repo.get("missing") is None


def test_duplicate_jti_is_rejected() -> None:
    repo = InMemoryRefreshTokenRepository()
    repo.create(_token())

    with pytest.raises(ValueError):
        repo.create(_token())


def test_claim_succeeds_only_once() -> None:
    repo = InMemoryRefreshTokenRepository()
    repo.create(_token())

    assert repo.claim("jti-1", _NOW) is True
    assert repo.claim("jti-1", _NOW) is False
    assert _get(repo, "jti-1").is_used()


def test_claim_unknown_jti_is_false() -> None:
    repo = InMemoryRefreshTokenRepository()

    assert repo.claim("nope", _NOW) is False


def test_revoke_family_only_touches_its_own_family() -> None:
    repo = InMemoryRefreshTokenRepository()
    repo.create(_token(jti="a1", family="fam-a"))
    repo.create(_token(jti="a2", family="fam-a"))
    repo.create(_token(jti="b1", family="fam-b"))

    repo.revoke_family("fam-a", _NOW)

    assert _get(repo, "a1").is_revoked()
    assert _get(repo, "a2").is_revoked()
    assert not _get(repo, "b1").is_revoked()


def test_delete_expired_removes_only_expired_tokens() -> None:
    repo = InMemoryRefreshTokenRepository()
    repo.create(_token(jti="old", family="fam-old"))
    alive = new_refresh_token(
        user_id=1, family="fam-new", ttl=_TTL * 2, now=_NOW, jti="new"
    )
    repo.create(alive)

    later = _NOW + timedelta(seconds=_TTL)
    assert repo.delete_expired(later) == 1
    assert repo.get("old") is None
    assert repo.get("new") is not None
