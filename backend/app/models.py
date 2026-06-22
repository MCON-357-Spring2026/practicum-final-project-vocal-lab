"""
SQLAlchemy database models (tables).

These classes map Python objects to rows in SQLite tables.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
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

    recordings = relationship("Recording", back_populates="user")
    projects = relationship("Project", back_populates="user")


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

    user = relationship("User", back_populates="recordings")


class Project(Base):
    """
    One studio project: upload → optional vocal removal → record → tune → export.

    File fields store filenames only; directories are fixed per type (see projects.py).
    """

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    upload_type = Column(String, nullable=False)  # "full_song" | "instrumental"
    status = Column(String, nullable=False, default="ready_to_record")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    detected_key = Column(String, nullable=True)
    mode = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    key_source = Column(String, nullable=True)  # "original" | "instrumental"

    original_stored_as = Column(String, nullable=True)
    instrumental_stored_as = Column(String, nullable=True)
    # Legacy single-vocal columns (kept for backward compat; superseded by takes).
    vocal_stored_as = Column(String, nullable=True)
    export_stored_as = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    takes = relationship(
        "Take",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class Take(Base):
    """
    One recorded vocal take within a project.

    A project can have many takes ("Take 1", "Take 2", …). Each take can be
    independently auto-tuned and exported.
    """

    __tablename__ = "takes"

    id = Column(Integer, primary_key=True, index=True)
    take_id = Column(String, unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String, nullable=False)  # e.g. "Take 1"

    # Raw browser recording under recordings/.
    vocal_stored_as = Column(String, nullable=True)
    # Auto-tuned vocal under corrected/ (set after pitch correction).
    corrected_stored_as = Column(String, nullable=True)
    # Final mixed MP3 under exports/.
    export_stored_as = Column(String, nullable=True)

    is_tuned = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="takes")
