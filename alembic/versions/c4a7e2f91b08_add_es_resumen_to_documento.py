"""add es_resumen to documento

Revision ID: c4a7e2f91b08
Revises: b7e4c2a91f03
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4a7e2f91b08"
down_revision: Union[str, Sequence[str], None] = "b7e4c2a91f03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "documento",
        sa.Column(
            "es_resumen",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("documento", "es_resumen")
