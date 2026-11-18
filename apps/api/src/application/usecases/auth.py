"""Authentication use cases: login, rotation and admin bootstrap (T-04/D-06).

Rotation policy: every refresh consumes the presented `jti` and issues a new
token of the same `family` with the family's absolute expiration. Reuse of a
consumed token revokes the whole family (stolen-token signal).
"""

import math
from dataclasses import replace
from datetime import datetime, timezone

from src.application.ports.document_repository import DocumentRepository
from src.application.ports.refresh_token_repository import RefreshTokenRepository
from src.application.ports.security import PasswordHasher, TokenService
from src.domain.refresh_token import (
    ExpiredRefreshToken,
    InvalidRefreshToken,
    ReusedRefreshToken,
    RevokedRefreshToken,
    TokenPair,
    new_family,
    new_refresh_token,
)
from src.domain.user import EmailAlreadyRegistered, User as DomainUser, new_user


def _now(now: datetime | None) -> datetime:
    """Injected clock for tests; production reads the wall clock."""
    return now if now is not None else datetime.now(timezone.utc)


def issue_session(
    user: DomainUser,
    refresh_repo: RefreshTokenRepository,
    tokens: TokenService,
    now: datetime | None = None,
) -> TokenPair:
    """Open a session: persist a refresh token and sign the pair."""
    timestamp = _now(now)
    family = new_family()
    stored = new_refresh_token(
        user_id=user.id,
        family=family,
        ttl=tokens.refresh_ttl,
        now=timestamp,
    )
    refresh_repo.create(stored)
    return TokenPair(
        access=tokens.create_access_token(user),
        refresh=tokens.create_refresh_token(user, stored.jti, family),
        refresh_expires_at=stored.expires_at,
    )


def login(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    tokens: TokenService,
    refresh_repo: RefreshTokenRepository,
    email: str,
    password: str,
    now: datetime | None = None,
) -> tuple[DomainUser, TokenPair] | None:
    """Return (user, tokens), or None for wrong credentials."""
    user = repository.get_user_by_email(email)
    if user is None or not hasher.verify(password, user.password_hash):
        return None
    return user, issue_session(user, refresh_repo, tokens, now)


def register_user(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    name: str,
    email: str,
    password: str,
) -> DomainUser:
    """Self-registration (D-28): role user; only sees own documents."""
    if repository.get_user_by_email(email) is not None:
        raise EmailAlreadyRegistered()
    # El duplicado por carrera lo detecta el adaptador real (unique de BD).
    return repository.create_user(
        new_user(email, hasher.hash(password), name=name)
    )


def rotate_session(
    refresh_repo: RefreshTokenRepository,
    repository: DocumentRepository,
    tokens: TokenService,
    raw_refresh: str,
    now: datetime | None = None,
) -> tuple[DomainUser, TokenPair]:
    """Consume `raw_refresh` and issue the next rotation of the same family."""
    timestamp = _now(now)
    claims = tokens.decode_refresh_token(raw_refresh)
    if claims is None:
        raise InvalidRefreshToken()

    stored = refresh_repo.get(claims.jti)
    if stored is None:
        raise InvalidRefreshToken()

    if stored.is_reuse():
        # A consumed token came back: possible theft, burn the family.
        refresh_repo.revoke_family(stored.family, timestamp)
        raise ReusedRefreshToken()
    if stored.is_revoked():
        raise RevokedRefreshToken()
    if stored.is_expired(timestamp):
        raise ExpiredRefreshToken()

    if not refresh_repo.claim(stored.jti, timestamp):
        # Lost the race against another rotation of the same token.
        refresh_repo.revoke_family(stored.family, timestamp)
        raise ReusedRefreshToken()

    user = repository.get_user(stored.user_id)
    if user is None:
        raise InvalidRefreshToken()

    # Absolute expiry: the family dies at `stored.expires_at`, rotations
    # never extend it. The new JWT only carries the remaining lifetime.
    remaining = math.ceil((stored.expires_at - timestamp).total_seconds())
    rotated = replace(
        new_refresh_token(
            user_id=user.id,
            family=stored.family,
            ttl=remaining,
            now=timestamp,
        ),
        expires_at=stored.expires_at,
    )
    refresh_repo.create(rotated)
    return user, TokenPair(
        access=tokens.create_access_token(user),
        refresh=tokens.create_refresh_token(
            user, rotated.jti, rotated.family, ttl=remaining
        ),
        refresh_expires_at=rotated.expires_at,
    )


def logout_session(
    refresh_repo: RefreshTokenRepository,
    tokens: TokenService,
    raw_refresh: str | None,
    now: datetime | None = None,
) -> None:
    """Revoke the session family; absent/invalid tokens are a no-op."""
    if not raw_refresh:
        return
    claims = tokens.decode_refresh_token(raw_refresh)
    if claims is None:
        return
    refresh_repo.revoke_family(claims.family, _now(now))


def bootstrap_admin(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    email: str,
    password: str,
) -> None:
    """Seed the first admin from env vars; never via an endpoint (D-22)."""
    if not email or not password:
        return
    if repository.get_user_by_email(email) is not None:
        return
    repository.create_user(new_user(email, hasher.hash(password), role="admin"))
