"""
Audio API routes: upload and key detection.

All routes are mounted under /audio (see main.py).
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from .services.key_detection import detect_key

router = APIRouter()

# Store uploads next to the backend root (sound-lab-backend/uploads/).
BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Only allow common audio extensions (lowercase, without the dot).
ALLOWED_EXTENSIONS = {"mp3", "wav", "ogg", "m4a", "flac", "webm"}


@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    Accept one audio file and save it to the uploads folder.

    Returns a public file_id the client can use later (e.g. to play or link).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lstrip(".").lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}.{extension}"
    file_path = UPLOAD_DIR / saved_name

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_path.write_bytes(contents)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "stored_as": saved_name,
        "message": "Upload successful",
    }


class KeyDetectionRequest(BaseModel):
    """JSON body for POST /audio/detect-key."""

    file_path: str  # Absolute path to an audio file on the server.


@router.post("/detect-key")
def detect_song_key(request: KeyDetectionRequest):
    """
    Detect the musical key of an audio file.

    Expects JSON: {"file_path": "C:/path/to/song.mp3"}
    """
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    result = detect_key(request.file_path)

    return result
