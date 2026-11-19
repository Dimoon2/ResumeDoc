"""Refresh token entity and pure rotation rules (spec D-06).

The table `token_refresco` lives in the persistence layer; this module only
holds the domain state and the single-use policy: a refresh token is usable
until it expires, is revoked or is consumed. Consuming a token that was
already used is a reuse signal (possible theft), which the use case turns
into a family-wide revocation.

Time is always injected (`now`): pure rules never read the clock.
"""

from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from uuid import uuid4


@dataclass(frozen=True)
class TokenPair:
    """Access and refresh tokens issued together.

    `refresh_expires_at` is the family's absolute expiration, so the HTTP
    adapter can size the refresh cookie with the remaining time instead of
    restarting the full TTL on every rotation.
    """

    access: str
    refresh: str
    refresh_expires_at: datetime | None = None


@dataclass(frozen=True)
class RefreshTokenClaims:
    """Identity carried by a valid refresh token (jti + session family)."""

    jti: str
    user_id: int
    family: str


@dataclass(frozen=True)
class RefreshToken:
    """Stored refresh token: one `jti` per rotation, one `family` per login.

    `expires_at` is absolute (login + TTL) and never extended by rotation.
    """

    jti: str
    user_id: int
    family: str
    expires_at: datetime
    created_at: datetime
    used_at: datetime | None = None
    revoked_at: datetime | None = None

    def is_expired(self, now: datetime) -> bool:
        """Expired at the boundary: `now == expires_at` is already invalid."""
        return now >= self.expires_at

    def is_revoked(self) -> bool:
        """Logically revoked (same policy as `usuario_acceso_usuario`)."""
        return self.revoked_at is not None

    def is_used(self) -> bool:
        """Already consumed by a previous rotation."""
        return self.used_at is not None

    def is_usable(self, now: datetime) -> bool:
        """Clean, unexpired and unrevoked: the only state that can rotate."""
        return not (self.is_expired(now) or self.is_revoked() or self.is_used())

    def is_reuse(self) -> bool:
        """A consumed token appeared again: replay or stolen token."""
        return self.used_at is not None

    def mark_used(self, now: datetime) -> "RefreshToken":
        """Return a copy with `used_at` set; the original is untouched."""
        return replace(self, used_at=now)

    def revoke(self, now: datetime) -> "RefreshToken":
        """Return a copy with `revoked_at` set; the original is untouched."""
        return replace(self, revoked_at=now)


def new_refresh_token(
    user_id: int,
    family: str,
    ttl: int,
    now: datetime,
    jti: str | None = None,
) -> RefreshToken:
    """Build a fresh token for a session family.

    `ttl` is the absolute lifetime in seconds; `jti` can be injected for
    deterministic tests and defaults to a random UUID4 hex.
    """
    if ttl <= 0:
        raise ValueError("El TTL del token de actualización debe ser positivo.")
    return RefreshToken(
        jti=jti or uuid4().hex,
        user_id=user_id,
        family=family,
        expires_at=now + timedelta(seconds=ttl),
        created_at=now,
    )


def new_family() -> str:
    """Identifier shared by every token rotation of one login."""
    return uuid4().hex


class RefreshTokenError(Exception):
    """Base of the refresh-token rejections (mapped to 401 by HTTP)."""


class InvalidRefreshToken(RefreshTokenError):
    """Malformed token, bad signature or unknown jti."""

    def __init__(self) -> None:
        super().__init__("El token de actualización no es válido.")


class ExpiredRefreshToken(RefreshTokenError):
    """Past the absolute expiration of the session family."""

    def __init__(self) -> None:
        super().__init__("El token de actualización ha expirado.")


class RevokedRefreshToken(RefreshTokenError):
    """The session family (or this token) was revoked."""

    def __init__(self) -> None:
        super().__init__("El token de actualización fue revocado.")


class ReusedRefreshToken(RefreshTokenError):
    """A consumed token was replayed: revoke the whole family."""

    def __init__(self) -> None:
        super().__init__("El token de actualización ya fue utilizado.")
