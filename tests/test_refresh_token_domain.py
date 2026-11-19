"""Unit tests for the refresh token domain (D-06).

Pure rules: absolute expiry, logical revocation, single-use rotation and the
reuse signal. No database, no clock reads inside the domain.
"""

from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone

import pytest

from src.domain.refresh_token import (
    RefreshToken,
    RefreshTokenClaims,
    TokenPair,
    new_family,
    new_refresh_token,
)

_NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)
_TTL = 600


def _token(**overrides: object) -> RefreshToken:
    defaults: dict[str, object] = {
        "jti": "jti-1",
        "user_id": 7,
        "family": "fam-1",
        "expires_at": _NOW + timedelta(seconds=_TTL),
        "created_at": _NOW,
    }
    defaults.update(overrides)
    return RefreshToken(**defaults)  # type: ignore[arg-type]


# --- Construcción --------------------------------------------------------


def test_new_refresh_token_sets_fields_and_absolute_expiry() -> None:
    token = new_refresh_token(user_id=7, family="fam-1", ttl=_TTL, now=_NOW)

    assert token.jti
    assert token.user_id == 7
    assert token.family == "fam-1"
    assert token.created_at == _NOW
    assert token.expires_at == _NOW + timedelta(seconds=_TTL)
    assert token.used_at is None
    assert token.revoked_at is None
    assert token.is_usable(_NOW)


def test_new_refresh_token_accepts_injected_jti() -> None:
    token = new_refresh_token(
        user_id=1, family="fam", ttl=_TTL, now=_NOW, jti="fixed-jti"
    )

    assert token.jti == "fixed-jti"


def test_new_refresh_token_generates_distinct_jti() -> None:
    first = new_refresh_token(user_id=1, family="fam", ttl=_TTL, now=_NOW)
    second = new_refresh_token(user_id=1, family="fam", ttl=_TTL, now=_NOW)

    assert first.jti != second.jti


@pytest.mark.parametrize("ttl", [0, -1])
def test_new_refresh_token_rejects_non_positive_ttl(ttl: int) -> None:
    with pytest.raises(ValueError):
        new_refresh_token(user_id=1, family="fam", ttl=ttl, now=_NOW)


def test_new_family_generates_distinct_values() -> None:
    assert new_family() != new_family()


# --- Expiración absoluta -------------------------------------------------


def test_token_is_not_expired_one_second_before_boundary() -> None:
    token = _token()

    assert not token.is_expired(token.expires_at - timedelta(seconds=1))
    assert token.is_usable(token.expires_at - timedelta(seconds=1))


def test_token_is_expired_at_the_boundary() -> None:
    token = _token()

    assert token.is_expired(token.expires_at)
    assert not token.is_usable(token.expires_at)


def test_token_is_expired_after_the_boundary() -> None:
    token = _token()

    assert token.is_expired(token.expires_at + timedelta(seconds=1))


# --- Revocación lógica ---------------------------------------------------


def test_revoke_marks_a_copy_without_mutating_the_original() -> None:
    token = _token()

    revoked = token.revoke(_NOW)

    assert revoked.revoked_at == _NOW
    assert revoked.is_revoked()
    assert not revoked.is_usable(_NOW)
    assert token.revoked_at is None
    assert token.is_usable(_NOW)


# --- Uso único y reuso ---------------------------------------------------


def test_mark_used_marks_a_copy_without_mutating_the_original() -> None:
    token = _token()

    used = token.mark_used(_NOW)

    assert used.used_at == _NOW
    assert used.is_used()
    assert not used.is_usable(_NOW)
    assert token.used_at is None
    assert token.is_usable(_NOW)


def test_is_reuse_is_false_until_the_token_is_used() -> None:
    token = _token()

    assert not token.is_reuse()
    assert token.mark_used(_NOW).is_reuse()


def test_is_usable_requires_clean_unexpired_and_unrevoked() -> None:
    clean = _token()
    revoked = clean.revoke(_NOW)
    used = clean.mark_used(_NOW)
    expired = _token(expires_at=_NOW - timedelta(seconds=1))

    assert clean.is_usable(_NOW)
    assert not revoked.is_usable(_NOW)
    assert not used.is_usable(_NOW)
    assert not expired.is_usable(_NOW)


# --- Entidades inmutables y auxiliares -----------------------------------


def test_refresh_token_is_immutable() -> None:
    token = _token()

    with pytest.raises(FrozenInstanceError):
        setattr(token, "jti", "other")


def test_claims_and_token_pair_carry_their_values() -> None:
    claims = RefreshTokenClaims(jti="jti-1", user_id=7, family="fam-1")
    pair = TokenPair(access="access", refresh="refresh")

    assert (claims.jti, claims.user_id, claims.family) == ("jti-1", 7, "fam-1")
    assert (pair.access, pair.refresh) == ("access", "refresh")
