"""JWT adapter for the TokenService port (PyJWT, spec D-06)."""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from src.domain.user import AuthContext, User

_ALGORITHM = "HS256"


class JwtTokenService:
    """Signs and decodes access/refresh tokens with a shared secret."""

    def __init__(self, secret: str, access_ttl: int, refresh_ttl: int) -> None:
        self._secret = secret
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl

    def create_access_token(self, user: User) -> str:
        return self._encode(user, "access", self._access_ttl)

    def create_refresh_token(self, user: User) -> str:
        return self._encode(user, "refresh", self._refresh_ttl)

    def decode_access_token(self, token: str) -> AuthContext | None:
        return self._decode(token, "access")

    def decode_refresh_token(self, token: str) -> AuthContext | None:
        return self._decode(token, "refresh")

    def _encode(self, user: User, token_type: str, ttl: int) -> str:
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
        return jwt.encode(payload, self._secret, algorithm=_ALGORITHM)

    def _decode(self, token: str, expected_type: str) -> AuthContext | None:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[_ALGORITHM])
        except jwt.PyJWTError:
            return None
        if payload.get("type") != expected_type:
            return None
        raw_sub = payload.get("sub", "")
        role = payload.get("role")
        try:
            # `sub` is a string per RFC 7519; the domain id is an int.
            user_id = int(raw_sub)
        except (TypeError, ValueError):
            return None
        if role not in ("user", "admin"):
            return None
        return AuthContext(
            user_id=user_id,
            email=str(payload.get("email", "")),
            role=role,
        )
