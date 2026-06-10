"""
SQLAlchemy database models (tables).

These classes map Python objects to rows in SQLite tables.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
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
    """
    One uploaded song owned by a user.

    Full-song pipeline: stored_as → (optional) instrumental_stored_as → key fields.
    key_source records whether detected_key came from the original or instrumental.
    """

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

    # Key detection (librosa). Populated on upload; may be updated after re-detect.
    detected_key = Column(String, nullable=True)  # e.g. "C", "F#"
    mode = Column(String, nullable=True)  # e.g. "major"
    confidence = Column(Float, nullable=True)  # correlation score from detect_key()
    # Which audio file produced the key above: "original" | "instrumental".
    key_source = Column(String, nullable=True)

    # Demucs output filename under instrumentals/ (set by POST .../remove-vocals).
    instrumental_stored_as = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # The user who owns this recording.
    user = relationship("User", back_populates="recordings")
