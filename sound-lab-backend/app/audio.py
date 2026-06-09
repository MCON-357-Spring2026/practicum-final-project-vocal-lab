"""
Audio API routes: upload, recordings CRUD, key detection, vocal removal, mixing.

Key flow:
  1. POST /upload          → auto-detect key on full song (key_source="original")
  2. POST .../remove-vocals → Demucs instrumental saved on recording
  3. POST .../redetect-key  → optional key pass on instrumental (key_source="instrumental")

Mounted under /audio (see main.py).
"""

import os
import uuid
from pathlib import Path

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from .auth import get_current_user, get_db
from .models import Recording, User
from .schemas import RecordingItem, RecordingResponse
from .services.audio_mixer import mix_audio
from .services.key_detection import detect_key
from .services.vocal_remover import remove_vocals

logger = logging.getLogger(__name__)

router = APIRouter()

# Store uploads next to the backend root (sound-lab-backend/uploads/).
BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# Demucs saves vocal-removed tracks here; served at GET /instrumentals/{filename}.
INSTRUMENTALS_DIR = BACKEND_ROOT / "instrumentals"
INSTRUMENTALS_DIR.mkdir(parents=True, exist_ok=True)

# Only allow common audio extensions (lowercase, without the dot).
ALLOWED_EXTENSIONS = {"mp3", "wav", "ogg", "m4a", "flac", "webm"}


async def _run_key_detection(
    recording: Recording,
    file_path: Path,
    db: Session,
    *,
    key_source: str,
) -> None:
    """
    Run librosa key detection and persist results on the recording.

    key_source records which file was analyzed:
      - "original"  → full upload (auto-runs on POST /upload)
      - "instrumental" → vocal-removed track (POST /redetect-key)

    Uses a thread pool so the async server is not blocked during analysis.
    Upload still succeeds if detection fails (fields stay null).
    """
    try:
        result = await run_in_threadpool(detect_key, str(file_path))
        recording.detected_key = result["key"]
        recording.mode = result["mode"]
        recording.confidence = result["confidence"]
        recording.key_source = key_source  # tells UI which audio the key came from
        db.commit()
        db.refresh(recording)
    except Exception:
        logger.exception("Key detection failed for %s", recording.file_id)


# Shared lookup for recording-scoped routes (remove-vocals, redetect-key, delete).
def _get_user_recording(
    file_id: str,
    db: Session,
    current_user: User,
) -> Recording:
    """Load a recording owned by the current user or raise 404."""
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
    return recording


def _resolve_audio_path(relative_or_absolute: str) -> Path:
    """Resolve a client path relative to the backend root (legacy /remove-vocals)."""
    path = Path(relative_or_absolute)
    if path.is_absolute() and path.exists():
        return path
    candidate = BACKEND_ROOT / relative_or_absolute
    if candidate.exists():
        return candidate
    raise HTTPException(status_code=404, detail="File not found")


def _recording_to_item(recording: Recording) -> dict:
    """Convert a DB row to JSON (includes key + instrumental fields for the frontend)."""
    return {
        "id": recording.id,
        "file_id": recording.file_id,
        "filename": recording.original_filename,
        "stored_as": recording.stored_as,
        "detected_key": recording.detected_key,
        "mode": recording.mode,
        "confidence": recording.confidence,
        "key_source": recording.key_source,
        "instrumental_stored_as": recording.instrumental_stored_as,
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
    recording = _get_user_recording(file_id, db, current_user)
    return _recording_to_item(recording)


@router.delete("/recordings/{file_id}")
def delete_recording(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete one recording and its file from disk if it belongs to the logged-in user."""
    recording = _get_user_recording(file_id, db, current_user)

    file_on_disk = UPLOAD_DIR / recording.stored_as
    if file_on_disk.exists():
        file_on_disk.unlink()

    # Also remove the instrumental if vocal removal was run for this recording.
    if recording.instrumental_stored_as:
        instrumental_on_disk = INSTRUMENTALS_DIR / recording.instrumental_stored_as
        if instrumental_on_disk.exists():
            instrumental_on_disk.unlink()

    db.delete(recording)
    db.commit()

    return {"message": "Deleted"}


@router.post("/upload", response_model=RecordingResponse)
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept one audio file, save it, store metadata, and auto-detect musical key.

    Flow: validate → save disk → DB row → key detection → return enriched JSON.
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

    # 1. Create DB record (key fields are null until detection finishes).
    recording = Recording(
        file_id=file_id,
        original_filename=file.filename,
        stored_as=saved_name,
        user_id=current_user.id,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    # 2. Auto-detect key on the full song before any vocal removal.
    await _run_key_detection(recording, file_path, db, key_source="original")

    # 3. Return upload result including key (if detection succeeded).
    return {
        "id": recording.id,
        "file_id": recording.file_id,
        "filename": recording.original_filename,
        "stored_as": recording.stored_as,
        "detected_key": recording.detected_key,
        "mode": recording.mode,
        "confidence": recording.confidence,
        "key_source": recording.key_source,
        "instrumental_stored_as": recording.instrumental_stored_as,
        "message": "Upload successful",
    }


@router.post("/recordings/{file_id}/remove-vocals", response_model=RecordingItem)
async def remove_vocals_for_recording(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run Demucs on the original upload and link the instrumental to this recording.

    Saves instrumental_stored_as so the client can play /instrumentals/{filename}
    and optionally re-detect key on the cleaner backing track.
    """
    recording = _get_user_recording(file_id, db, current_user)
    input_path = UPLOAD_DIR / recording.stored_as

    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Original song file not found")

    # Demucs is slow — run off the event loop like key detection.
    try:
        result = await run_in_threadpool(remove_vocals, str(input_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Replace any previous instrumental if the user runs removal again.
    if recording.instrumental_stored_as:
        old_instrumental = INSTRUMENTALS_DIR / recording.instrumental_stored_as
        if old_instrumental.exists():
            old_instrumental.unlink()

    recording.instrumental_stored_as = result["filename"]
    db.commit()
    db.refresh(recording)

    return _recording_to_item(recording)


@router.post("/recordings/{file_id}/redetect-key", response_model=RecordingItem)
async def redetect_key_on_instrumental(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Optional second key pass on the instrumental (vocals can skew the first result).

    Overwrites detected_key/mode/confidence and sets key_source to "instrumental".
    """
    recording = _get_user_recording(file_id, db, current_user)

    if not recording.instrumental_stored_as:
        raise HTTPException(
            status_code=400,
            detail="Remove vocals first before re-detecting key on the instrumental",
        )

    instrumental_path = INSTRUMENTALS_DIR / recording.instrumental_stored_as
    if not instrumental_path.exists():
        raise HTTPException(status_code=404, detail="Instrumental file not found")

    await _run_key_detection(
        recording,
        instrumental_path,
        db,
        key_source="instrumental",
    )

    return _recording_to_item(recording)


class KeyDetectionRequest(BaseModel):
    """JSON body for POST /audio/detect-key."""

    file_path: str


@router.post("/detect-key")
def detect_song_key(request: KeyDetectionRequest):
    """Manual key detection by server file path (upload does this automatically)."""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return detect_key(request.file_path)


@router.post("/remove-vocals")
def remove_vocals_from_song(request: KeyDetectionRequest):
    """Legacy path-based vocal removal (prefer /recordings/{file_id}/remove-vocals)."""
    input_path = _resolve_audio_path(request.file_path)

    try:
        result = remove_vocals(str(input_path))

        return {
            "message": "Vocals removed successfully",
            "filename": result["filename"],
            "file_path": result["file_path"],
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
