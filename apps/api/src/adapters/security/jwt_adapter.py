"""JWT adapter for the TokenService port (PyJWT, spec D-06).

Access tokens keep the original payload (`sub`, `email`, `role`, `type`).
Refresh tokens add `jti` and `family`, which tie a signed token to a stored
session row without putting any trust on the client.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from src.domain.refresh_token import RefreshTokenClaims
from src.domain.user import AuthContext, User

_ALGORITHM = "HS256"


class JwtTokenService:
    """Signs and decodes access/refresh tokens with a shared secret."""

    def __init__(self, secret: str, access_ttl: int, refresh_ttl: int) -> None:
        self._secret = secret
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl

    @property
    def refresh_ttl(self) -> int:
        return self._refresh_ttl

    def create_access_token(self, user: User) -> str:
        return self._encode(user, "access", self._access_ttl)

    def create_refresh_token(
        self,
        user: User,
        jti: str,
        family: str,
        ttl: int | None = None,
    ) -> str:
        # `ttl` lets rotation sign only the remaining time of the family.
        lifetime = self._refresh_ttl if ttl is None else ttl
        return self._encode(
            user,
            "refresh",
            lifetime,
            extra={"jti": jti, "family": family},
        )

    def decode_access_token(self, token: str) -> AuthContext | None:
        payload = self._payload(token, "access")
        if payload is None:
            return None
        role = payload.get("role")
        user_id = self._user_id(payload)
        if user_id is None or role not in ("user", "admin"):
            return None
        return AuthContext(
            user_id=user_id,
            email=str(payload.get("email", "")),
            role=role,
        )

    def decode_refresh_token(self, token: str) -> RefreshTokenClaims | None:
        payload = self._payload(token, "refresh")
        if payload is None:
            return None
        jti = payload.get("jti")
        family = payload.get("family")
        if not isinstance(jti, str) or not jti:
            return None
        if not isinstance(family, str) or not family:
            return None
        user_id = self._user_id(payload)
        if user_id is None:
            return None
        return RefreshTokenClaims(jti=jti, user_id=user_id, family=family)

    def _encode(
        self,
        user: User,
        token_type: str,
        ttl: int,
        extra: dict[str, Any] | None = None,
    ) -> str:
        now = datetime.now(timezone.utc)
        payload: dict[str, Any] = {
            # RFC 7519: `sub` must be a string even when the id is an int.
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "type": token_type,
            "iat": now,
            "exp": now + timedelta(seconds=ttl),
        }
        if extra:
            payload.update(extra)
        return jwt.encode(payload, self._secret, algorithm=_ALGORITHM)

    def _payload(self, token: str, expected_type: str) -> dict[str, Any] | None:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[_ALGORITHM])
        except jwt.PyJWTError:
            return None
        if payload.get("type") != expected_type:
            return None
        return payload

    @staticmethod
    def _user_id(payload: dict[str, Any]) -> int | None:
        try:
            # `sub` is a string per RFC 7519; the domain id is an int.
            return int(payload.get("sub", ""))
        except (TypeError, ValueError):
            return None
