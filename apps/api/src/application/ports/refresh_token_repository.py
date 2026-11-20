"""Persistence port for refresh-token sessions (spec D-06).

One row per rotation (`jti`) grouped by session `family`. The port owns the
single-use policy mechanically (`claim`), while the decision of what to do on
reuse stays in the use cases.
"""

from datetime import datetime
from typing import Protocol

from src.domain.refresh_token import RefreshToken


class RefreshTokenRepository(Protocol):
    """Stores, looks up and consumes refresh tokens."""

    def create(self, token: RefreshToken) -> None:
        """Persist a freshly issued token; a duplicate `jti` is a bug."""
        ...

    def get(self, jti: str) -> RefreshToken | None:
        """Return the stored token for that `jti`, or None."""
        ...

    def claim(self, jti: str, now: datetime) -> bool:
        """Mark the token as used exactly once; False if absent or already used."""
        ...

    def revoke_family(self, family: str, now: datetime) -> None:
        """Revoke every still-active token of the session family."""
        ...

    def delete_expired(self, now: datetime) -> int:
        """Delete expired tokens and return how many were removed."""
        ...
