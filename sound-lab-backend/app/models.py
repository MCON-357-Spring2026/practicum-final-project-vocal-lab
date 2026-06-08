"""
SQLAlchemy database models (tables).

These classes map Python objects to rows in SQLite tables.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

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

    # All recordings uploaded by this user.
    recordings = relationship("Recording", back_populates="user")


class Recording(Base):
    """Represents one uploaded audio file owned by a user."""

    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)

    # Public UUID returned from /audio/upload (used in API URLs).
    file_id = Column(String, unique=True, index=True, nullable=False)

    # Original name from the user's computer.
    original_filename = Column(String, nullable=False)

    # Saved disk name under uploads/, e.g. "uuid.mp3".
    stored_as = Column(String, nullable=False)

    # Owner of this recording.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # The user who owns this recording.
    user = relationship("User", back_populates="recordings")
