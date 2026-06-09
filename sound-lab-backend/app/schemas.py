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
    """One recording in a list or detail response."""

    id: int  # Database primary key.
    file_id: str  # Public UUID used in API URLs.
    filename: str  # Original name from the user's computer.
    stored_as: str  # Disk filename under uploads/ (for /uploads/{stored_as}).
    detected_key: str | None = None  # e.g. "C" — null until analyzed.
    mode: str | None = None  # e.g. "major"
    confidence: float | None = None  # 0.0–1.0 from key detection.
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
    message: str
