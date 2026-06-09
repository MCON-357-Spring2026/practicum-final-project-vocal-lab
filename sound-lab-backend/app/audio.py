"""
Audio API routes: upload, recordings CRUD, key detection, and mixing.

Mounted under /audio (see main.py).
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user, get_db
from .models import Recording, User
from .schemas import RecordingItem, RecordingResponse
from .services.audio_mixer import mix_audio
from .services.key_detection import detect_key
from .services.vocal_remover import remove_vocals

router = APIRouter()

# Store uploads next to the backend root (sound-lab-backend/uploads/).
BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Only allow common audio extensions (lowercase, without the dot).
ALLOWED_EXTENSIONS = {"mp3", "wav", "ogg", "m4a", "flac", "webm"}


def _recording_to_item(recording: Recording) -> dict:
    """Convert a DB row to the JSON shape the API returns."""
    return {
        "id": recording.id,
        "file_id": recording.file_id,
        "filename": recording.original_filename,
        "stored_as": recording.stored_as,
        "created_at": recording.created_at,
    }


@router.get("/mine", response_model=list[RecordingItem])
def list_my_recordings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all recordings uploaded by the logged-in user."""
    recordings = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .order_by(Recording.created_at.desc())
        .all()
    )
    return [_recording_to_item(recording) for recording in recordings]


@router.get("/recordings/{file_id}", response_model=RecordingItem)
def get_recording(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return one recording by file_id if it belongs to the logged-in user."""
    recording = (
        db.query(Recording)
        .filter(
            Recording.file_id == file_id,
            Recording.user_id == current_user.id,
        )
        .first()
    )
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    return _recording_to_item(recording)


@router.delete("/recordings/{file_id}")
def delete_recording(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete one recording and its file from disk if it belongs to the logged-in user."""
    recording = (
        db.query(Recording)
        .filter(
            Recording.file_id == file_id,
            Recording.user_id == current_user.id,
        )
        .first()
    )
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    file_on_disk = UPLOAD_DIR / recording.stored_as
    if file_on_disk.exists():
        file_on_disk.unlink()

    db.delete(recording)
    db.commit()

    return {"message": "Deleted"}


@router.post("/upload", response_model=RecordingResponse)
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept one audio file, save it to disk, and store metadata in the database."""
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

    recording = Recording(
        file_id=file_id,
        original_filename=file.filename,
        stored_as=saved_name,
        user_id=current_user.id,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    return {
        "id": recording.id,
        "file_id": recording.file_id,
        "filename": recording.original_filename,
        "stored_as": recording.stored_as,
        "message": "Upload successful",
    }


class KeyDetectionRequest(BaseModel):
    """JSON body for POST /audio/detect-key."""

    file_path: str


@router.post("/detect-key")
def detect_song_key(request: KeyDetectionRequest):
    """Detect the musical key of an audio file on the server."""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return detect_key(request.file_path)


@router.post("/remove-vocals")
def remove_vocals_from_song(request: KeyDetectionRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="Original song file not found")

    try:
        result = remove_vocals(request.file_path)

        return {
            "message": "Vocals removed successfully",
            "filename": result["filename"],
            "file_path": result["file_path"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class MixRequest(BaseModel):
    """JSON body for POST /audio/mix."""

    instrumental_path: str
    vocal_path: str


@router.post("/mix")
def mix_tracks(request: MixRequest):
    """Overlay vocal track onto instrumental and export as MP3."""
    if not os.path.exists(request.instrumental_path):
        raise HTTPException(status_code=404, detail="Instrumental file not found")
    if not os.path.exists(request.vocal_path):
        raise HTTPException(status_code=404, detail="Vocal file not found")

    result = mix_audio(request.instrumental_path, request.vocal_path)

    return {
        "message": "Export created successfully",
        "filename": result["filename"],
        "file_path": result["file_path"],
    }
