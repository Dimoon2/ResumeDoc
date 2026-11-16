"""Security ports: JWT tokens and password hashing (spec D-06)."""

from typing import Protocol

from src.domain.user import AuthContext, User


class TokenService(Protocol):
    """Creates and verifies access/refresh tokens."""

    def create_access_token(self, user: User) -> str: ...
    def create_refresh_token(self, user: User) -> str: ...
    def decode_access_token(self, token: str) -> AuthContext | None: ...
    def decode_refresh_token(self, token: str) -> AuthContext | None: ...


class PasswordHasher(Protocol):
    """Hashes and verifies passwords (bcrypt)."""

    def hash(self, password: str) -> str: ...
    def verify(self, password: str, password_hash: str) -> bool: ...
