"""add documento_contenido_documento link table

Revision ID: b7e4c2a91f03
Revises: 24c3be28d41a
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7e4c2a91f03"
down_revision: Union[str, Sequence[str], None] = "24c3be28d41a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "documento_contenido_documento",
        sa.Column("contenedor_id", sa.Integer(), nullable=False),
        sa.Column("contenido_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "contenedor_id != contenido_id",
            name="ck_documento_contenido_documento_no_self",
        ),
        sa.ForeignKeyConstraint(
            ["contenedor_id"], ["documento.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["contenido_id"], ["documento.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("contenedor_id", "contenido_id"),
    )
    op.create_index(
        op.f("ix_documento_contenido_documento_contenido_id"),
        "documento_contenido_documento",
        ["contenido_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_documento_contenido_documento_contenido_id"),
        table_name="documento_contenido_documento",
    )
    op.drop_table("documento_contenido_documento")
