"""
Audio analysis API routes.

All routes are mounted under /audio (see main.py).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.key_detection import detect_key
import os

# Groups all audio endpoints; included in main.py with prefix="/audio".
router = APIRouter()


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
