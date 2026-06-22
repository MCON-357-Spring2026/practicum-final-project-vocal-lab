"""add takes table

Revision ID: 005
Revises: 3af79573aea5
Create Date: 2026-06-18

"""
from datetime import datetime
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, Sequence[str], None] = "3af79573aea5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "takes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("take_id", sa.String(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("vocal_stored_as", sa.String(), nullable=True),
        sa.Column("corrected_stored_as", sa.String(), nullable=True),
        sa.Column("export_stored_as", sa.String(), nullable=True),
        sa.Column("is_tuned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_takes_id"), "takes", ["id"], unique=False)
    op.create_index(op.f("ix_takes_take_id"), "takes", ["take_id"], unique=True)
    op.create_index(op.f("ix_takes_project_id"), "takes", ["project_id"], unique=False)

    # Migrate any existing single-vocal projects into a first take.
    connection = op.get_bind()
    projects = connection.execute(
        sa.text(
            "SELECT id, project_id, status, vocal_stored_as, export_stored_as "
            "FROM projects WHERE vocal_stored_as IS NOT NULL"
        )
    ).fetchall()

    now = datetime.utcnow()
    for row in projects:
        is_tuned = row.status in ("tuned", "exported")
        connection.execute(
            sa.text(
                "INSERT INTO takes "
                "(take_id, project_id, name, vocal_stored_as, corrected_stored_as, "
                "export_stored_as, is_tuned, created_at) "
                "VALUES (:take_id, :project_id, :name, :vocal, :corrected, "
                ":export, :is_tuned, :created_at)"
            ),
            {
                "take_id": f"{row.project_id}_take1",
                "project_id": row.id,
                "name": "Take 1",
                "vocal": row.vocal_stored_as,
                "corrected": row.vocal_stored_as if is_tuned else None,
                "export": row.export_stored_as,
                "is_tuned": is_tuned,
                "created_at": now,
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_takes_project_id"), table_name="takes")
    op.drop_index(op.f("ix_takes_take_id"), table_name="takes")
    op.drop_index(op.f("ix_takes_id"), table_name="takes")
    op.drop_table("takes")
