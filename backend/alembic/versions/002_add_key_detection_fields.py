"""add key detection fields to recordings

Revision ID: 002
Revises: 001
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, Sequence[str], None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Filled by librosa on POST /upload (see app/services/key_detection.py).
    # Nullable: existing rows and new uploads before analysis have no key yet.
    op.add_column("recordings", sa.Column("detected_key", sa.String(), nullable=True))
    op.add_column("recordings", sa.Column("mode", sa.String(), nullable=True))
    op.add_column("recordings", sa.Column("confidence", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("recordings", "confidence")
    op.drop_column("recordings", "mode")
    op.drop_column("recordings", "detected_key")
