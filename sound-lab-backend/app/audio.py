"""
Audio upload API routes.

Mounted under /audio (see main.py).
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

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
