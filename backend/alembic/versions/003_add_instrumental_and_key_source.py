"""add instrumental path and key source to recordings

Revision ID: 003
Revises: 002
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, Sequence[str], None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tracks whether key came from full song or post-removal instrumental.
    op.add_column("recordings", sa.Column("key_source", sa.String(), nullable=True))
    # Demucs output filename; null until POST /recordings/{file_id}/remove-vocals.
    op.add_column(
        "recordings", sa.Column("instrumental_stored_as", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("recordings", "instrumental_stored_as")
    op.drop_column("recordings", "key_source")
