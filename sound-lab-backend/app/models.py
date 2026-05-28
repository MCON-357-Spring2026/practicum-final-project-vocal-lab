"""
SQLAlchemy database models (tables).

These classes map Python objects to rows in SQLite tables.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from .database import Base


class User(Base):
    """Represents one row in the `users` table."""

    __tablename__ = "users"

    # Auto-incrementing primary key.
    id = Column(Integer, primary_key=True, index=True)

    # Login identifier; must be unique across all users.
    email = Column(String, unique=True, index=True, nullable=False)

    # Hashed password only — never store plain text passwords.
    password_hash = Column(String, nullable=False)

    # When the account was created (UTC).
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
