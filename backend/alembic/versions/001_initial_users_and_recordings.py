"""initial users and recordings tables

Revision ID: 001
Revises:
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Auth table: one row per registered user.
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    # Upload metadata: each row links one file on disk to one user.
    op.create_table(
        "recordings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("stored_as", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recordings_file_id"), "recordings", ["file_id"], unique=True)
    op.create_index(op.f("ix_recordings_id"), "recordings", ["id"], unique=False)
    op.create_index(op.f("ix_recordings_user_id"), "recordings", ["user_id"], unique=False)


def downgrade() -> None:
    # Reverse upgrade: drop tables in dependency order (recordings first).
    op.drop_index(op.f("ix_recordings_user_id"), table_name="recordings")
    op.drop_index(op.f("ix_recordings_id"), table_name="recordings")
    op.drop_index(op.f("ix_recordings_file_id"), table_name="recordings")
    op.drop_table("recordings")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
