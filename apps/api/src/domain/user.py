"""Domain entities for users and the authenticated caller context.

Mirrors the DB entity `usuario` of branch `data-base`: int id, `nombre`
(name), `correo` (email) and role. Domain role values stay `user`/`admin`;
the persistence adapter maps `user` to `noadmin` (D-27).
"""

from dataclasses import dataclass
from typing import Literal

Role = Literal["user", "admin"]


class EmailAlreadyRegistered(Exception):
    """Duplicate email at registration (the BD enforces uniqueness)."""

    def __init__(self) -> None:
        super().__init__("Ya existe una cuenta con ese correo.")


@dataclass(frozen=True)
class User:
    """A platform user (spec §4, entity `usuario`)."""

    email: str
    password_hash: str
    role: Role = "user"
    id: int = 0  # 0 = not yet persisted; the repository assigns the real id
    name: str = ""


@dataclass(frozen=True)
class AuthContext:
    """Identity carried by a valid access token (claim `role`, spec D-23)."""

    user_id: int
    email: str
    role: Role


def new_user(
    email: str, password_hash: str, role: Role = "user", name: str = ""
) -> User:
    """Build a user not yet persisted (id is assigned by the repository)."""
    return User(email=email, password_hash=password_hash, role=role, name=name)
