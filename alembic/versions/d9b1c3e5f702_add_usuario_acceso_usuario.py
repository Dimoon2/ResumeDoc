"""add usuario_acceso_usuario

Revision ID: d9b1c3e5f702
Revises: c4a7e2f91b08
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "d9b1c3e5f702"
down_revision: Union[str, Sequence[str], None] = "c4a7e2f91b08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "usuario_acceso_usuario",
        sa.Column("propietario_id", sa.Integer(), nullable=False),
        sa.Column("autorizado_id", sa.Integer(), nullable=False),
        sa.Column(
            "puede_editar",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "fecha_otorgamiento",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=False,
        ),
        sa.Column(
            "fecha_revocacion",
            sqlmodel.sql.sqltypes.UTCDateTime(),
            nullable=True,
        ),
        sa.CheckConstraint(
            "propietario_id != autorizado_id",
            name="ck_usuario_acceso_usuario_no_self",
        ),
        sa.ForeignKeyConstraint(
            ["propietario_id"], ["usuario.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["autorizado_id"], ["usuario.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("propietario_id", "autorizado_id"),
    )
    op.create_index(
        op.f("ix_usuario_acceso_usuario_autorizado_id"),
        "usuario_acceso_usuario",
        ["autorizado_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_usuario_acceso_usuario_autorizado_id"),
        table_name="usuario_acceso_usuario",
    )
    op.drop_table("usuario_acceso_usuario")
