"""add token_refresco

Revision ID: e3f9a7c1b204
Revises: d9b1c3e5f702
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "e3f9a7c1b204"
down_revision: Union[str, Sequence[str], None] = "d9b1c3e5f702"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "token_refresco",
        sa.Column("jti", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("familia", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "fecha_expiracion",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=False,
        ),
        sa.Column(
            "fecha_creacion",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=False,
        ),
        sa.Column(
            "fecha_uso",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=True,
        ),
        sa.Column(
            "fecha_revocacion",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("jti"),
    )
    op.create_index(
        op.f("ix_token_refresco_usuario_id"),
        "token_refresco",
        ["usuario_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_token_refresco_familia"),
        "token_refresco",
        ["familia"],
        unique=False,
    )
    op.create_index(
        op.f("ix_token_refresco_fecha_expiracion"),
        "token_refresco",
        ["fecha_expiracion"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_token_refresco_fecha_expiracion"), table_name="token_refresco"
    )
    op.drop_index(
        op.f("ix_token_refresco_familia"), table_name="token_refresco"
    )
    op.drop_index(
        op.f("ix_token_refresco_usuario_id"), table_name="token_refresco"
    )
    op.drop_table("token_refresco")
