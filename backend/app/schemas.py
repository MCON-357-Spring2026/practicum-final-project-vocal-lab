"""
Pydantic request/response schemas.

These define the JSON shape FastAPI expects (request bodies)
and what it returns (response bodies). They are NOT database tables.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """JSON body for POST /auth/register."""

    email: EmailStr  # Must be a valid email format.
    password: str  # Plain password from the client (hashed before saving).


class UserLogin(BaseModel):
    """JSON body for POST /auth/login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """JSON response returned after a successful login."""

    access_token: str  # JWT string the client sends on protected routes.
    token_type: str  # Always "bearer" — used in Authorization: Bearer <token>.


class RecordingItem(BaseModel):
    """One recording returned by /mine, /recordings/{id}, remove-vocals, or redetect-key."""

    id: int  # Database primary key.
    file_id: str  # Public UUID used in API URLs.
    filename: str  # Original name from the user's computer.
    stored_as: str  # Disk filename under uploads/ (for /uploads/{stored_as}).
    detected_key: str | None = None  # e.g. "C" — null until analyzed.
    mode: str | None = None  # e.g. "major"
    confidence: float | None = None  # 0.0–1.0 from key detection.
    key_source: str | None = None  # "original" (upload) or "instrumental" (re-detect)
    instrumental_stored_as: str | None = None  # play at /instrumentals/{this}
    created_at: datetime


class RecordingResponse(BaseModel):
    """JSON response returned after a successful upload (includes auto-detected key)."""

    id: int
    file_id: str
    filename: str
    stored_as: str
    detected_key: str | None = None  # Filled by librosa after upload.
    mode: str | None = None  # e.g. "major"
    confidence: float | None = None  # Higher = more confident match
    key_source: str | None = None  # always "original" on upload response
    instrumental_stored_as: str | None = None  # null until vocal removal runs
    message: str


# --- Project schemas (see docs/API_CONTRACT.md) ---


class ProjectUpdate(BaseModel):
    """JSON body for PATCH /projects/{project_id} — rename a project."""

    name: str


class TakeUpdate(BaseModel):
    """JSON body for PATCH /projects/{project_id}/takes/{take_id} — rename a take."""

    name: str


class TakeResponse(BaseModel):
    """JSON shape for one recorded take within a project."""

    take_id: str
    name: str
    vocal_stored_as: str | None = None
    corrected_stored_as: str | None = None
    export_stored_as: str | None = None
    is_tuned: bool = False
    created_at: datetime


class ProjectResponse(BaseModel):
    """JSON shape for /projects endpoints."""

    id: int
    project_id: str
    name: str
    upload_type: str
    status: str
    detected_key: str | None = None
    mode: str | None = None
    confidence: float | None = None
    key_source: str | None = None
    original_stored_as: str | None = None
    instrumental_stored_as: str | None = None
    vocal_stored_as: str | None = None
    export_stored_as: str | None = None
    takes: list[TakeResponse] = []
    created_at: datetime
