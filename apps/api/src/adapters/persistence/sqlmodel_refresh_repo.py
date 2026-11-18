"""SQLModel adapter for the refresh-token repository port (D-06).

Maps `token_refresco` rows to the `RefreshToken` domain entity. `claim` and
`revoke_family` are single atomic statements so concurrent rotations cannot
consume the same `jti` twice. All datetimes are normalized to UTC because the
column type (`UTCDateTime`) rejects naive values on write.
"""

from datetime import datetime, timezone
from typing import Any, cast

from sqlalchemy import create_engine, delete, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col

from db.models import TokenRefresco
from src.domain.refresh_token import RefreshToken


def _utc(value: datetime) -> datetime:
    """Normalize to an aware UTC datetime; naive values are assumed UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_optional(value: datetime | None) -> datetime | None:
    return None if value is None else _utc(value)


def _to_domain(row: TokenRefresco) -> RefreshToken:
    return RefreshToken(
        jti=row.jti,
        user_id=row.usuario_id,
        family=row.familia,
        expires_at=_utc(row.fecha_expiracion),
        created_at=_utc(row.fecha_creacion),
        used_at=_utc_optional(row.fecha_uso),
        revoked_at=_utc_optional(row.fecha_revocacion),
    )


class SQLModelRefreshTokenRepository:
    """Persistence of refresh sessions against PostgreSQL."""

    def __init__(self, database_url: str) -> None:
        self._engine = create_engine(database_url, pool_pre_ping=True)

    def create(self, token: RefreshToken) -> None:
        """Insert a token; a duplicate `jti` is reported as `ValueError`."""
        row = TokenRefresco(
            jti=token.jti,
            usuario_id=token.user_id,
            familia=token.family,
            fecha_expiracion=_utc(token.expires_at),
            fecha_creacion=_utc(token.created_at),
            fecha_uso=_utc_optional(token.used_at),
            fecha_revocacion=_utc_optional(token.revoked_at),
        )
        with Session(self._engine) as session:
            session.add(row)
            try:
                session.commit()
            except IntegrityError as exc:
                raise ValueError(f"El jti {token.jti!r} ya existe.") from exc

    def get(self, jti: str) -> RefreshToken | None:
        with Session(self._engine) as session:
            row = session.get(TokenRefresco, jti)
            return _to_domain(row) if row is not None else None

    def claim(self, jti: str, now: datetime) -> bool:
        """Consume the token exactly once; the winning UPDATE affects one row."""
        with Session(self._engine) as session:
            result = session.execute(
                update(TokenRefresco)
                .where(
                    col(TokenRefresco.jti) == jti,
                    col(TokenRefresco.fecha_uso).is_(None),
                )
                .values(fecha_uso=_utc(now))
            )
            session.commit()
            return cast(CursorResult[Any], result).rowcount == 1

    def revoke_family(self, family: str, now: datetime) -> None:
        with Session(self._engine) as session:
            session.execute(
                update(TokenRefresco)
                .where(
                    col(TokenRefresco.familia) == family,
                    col(TokenRefresco.fecha_revocacion).is_(None),
                )
                .values(fecha_revocacion=_utc(now))
            )
            session.commit()

    def delete_expired(self, now: datetime) -> int:
        with Session(self._engine) as session:
            result = session.execute(
                delete(TokenRefresco).where(
                    col(TokenRefresco.fecha_expiracion) <= _utc(now)
                )
            )
            session.commit()
            return cast(CursorResult[Any], result).rowcount
