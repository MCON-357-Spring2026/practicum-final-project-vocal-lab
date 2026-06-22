"""
Projects API — studio workflow per docs/API_CONTRACT.md.

Mounted under /projects (see main.py).
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from .auth import get_current_user, get_db
from .models import Project, Take, User
from .schemas import ProjectResponse, ProjectUpdate, TakeUpdate
from .services.audio_mixer import mix_audio
from .services.key_detection import detect_key
from .services.pitch_correction import apply_basic_pitch_correction
from .services.vocal_remover import remove_vocals
from .storage import (
    CORRECTED_DIR,
    EXPORTS_DIR,
    INSTRUMENTALS_DIR,
    RECORDINGS_DIR,
    UPLOAD_DIR,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {"mp3", "wav", "ogg", "m4a", "flac", "webm"}
UPLOAD_TYPES = {"full_song", "instrumental"}


def _take_to_item(take: Take) -> dict:
    return {
        "take_id": take.take_id,
        "name": take.name,
        "vocal_stored_as": take.vocal_stored_as,
        "corrected_stored_as": take.corrected_stored_as,
        "export_stored_as": take.export_stored_as,
        "is_tuned": take.is_tuned,
        "created_at": take.created_at,
    }


def _project_to_item(project: Project) -> dict:
    takes = sorted(
        project.takes,
        key=lambda t: (t.created_at or datetime.min, t.id),
        reverse=True,
    )
    return {
        "id": project.id,
        "project_id": project.project_id,
        "name": project.name,
        "upload_type": project.upload_type,
        "status": project.status,
        "detected_key": project.detected_key,
        "mode": project.mode,
        "confidence": project.confidence,
        "key_source": project.key_source,
        "original_stored_as": project.original_stored_as,
        "instrumental_stored_as": project.instrumental_stored_as,
        "vocal_stored_as": project.vocal_stored_as,
        "export_stored_as": project.export_stored_as,
        "takes": [_take_to_item(take) for take in takes],
        "created_at": project.created_at,
    }


def _get_take(project: Project, take_id: str) -> Take:
    for take in project.takes:
        if take.take_id == take_id:
            return take
    raise HTTPException(status_code=404, detail="Take not found")


def _resolve_take_vocal_path(take: Take) -> Path:
    """Best vocal file for a take: auto-tuned if available, else the raw recording."""
    if take.corrected_stored_as:
        corrected = CORRECTED_DIR / take.corrected_stored_as
        if corrected.exists():
            return corrected

    if take.vocal_stored_as:
        recording = RECORDINGS_DIR / take.vocal_stored_as
        if recording.exists():
            return recording

    raise HTTPException(status_code=404, detail="Take vocal file not found")


def _delete_take_files(take: Take) -> None:
    if take.vocal_stored_as:
        _unlink_if_exists(RECORDINGS_DIR / take.vocal_stored_as)
    if take.corrected_stored_as:
        _unlink_if_exists(CORRECTED_DIR / take.corrected_stored_as)
    if take.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / take.export_stored_as)


def _sync_project_status(project: Project) -> None:
    """Keep project.status meaningful for the dashboard, based on its takes."""
    if project.status == "processing":
        return

    takes = project.takes
    if not takes:
        project.status = "ready_to_record"
    elif any(take.export_stored_as for take in takes):
        project.status = "exported"
    elif any(take.is_tuned for take in takes):
        project.status = "tuned"
    else:
        project.status = "vocal_recorded"


def _get_user_project(project_id: str, db: Session, current_user: User) -> Project:
    project = (
        db.query(Project)
        .filter(Project.project_id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _unlink_if_exists(path: Path) -> None:
    if path.exists():
        path.unlink()


def _clear_vocal_files(project: Project) -> None:
    if project.vocal_stored_as:
        _unlink_if_exists(RECORDINGS_DIR / project.vocal_stored_as)
        _unlink_if_exists(CORRECTED_DIR / project.vocal_stored_as)
    for path in RECORDINGS_DIR.glob(f"{project.project_id}_vocal.*"):
        _unlink_if_exists(path)
    if project.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / project.export_stored_as)


def _delete_project_files(project: Project) -> None:
    if project.original_stored_as:
        _unlink_if_exists(UPLOAD_DIR / project.original_stored_as)
    if project.instrumental_stored_as:
        _unlink_if_exists(INSTRUMENTALS_DIR / project.instrumental_stored_as)
    if project.vocal_stored_as:
        _unlink_if_exists(RECORDINGS_DIR / project.vocal_stored_as)
        _unlink_if_exists(CORRECTED_DIR / project.vocal_stored_as)
    if project.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / project.export_stored_as)


def _resolve_vocal_path(project: Project) -> Path:
    if not project.vocal_stored_as:
        raise HTTPException(status_code=400, detail="No vocal recording on this project")

    corrected = CORRECTED_DIR / project.vocal_stored_as
    if corrected.exists():
        return corrected

    recording = RECORDINGS_DIR / project.vocal_stored_as
    if recording.exists():
        return recording

    raise HTTPException(status_code=404, detail="Vocal file not found")


def _resolve_backing_track_path(project: Project) -> Path:
    if project.instrumental_stored_as:
        path = INSTRUMENTALS_DIR / project.instrumental_stored_as
        if path.exists():
            return path
        raise HTTPException(status_code=404, detail="Instrumental file not found")

    if project.original_stored_as:
        path = UPLOAD_DIR / project.original_stored_as
        if path.exists():
            return path
        raise HTTPException(status_code=404, detail="Original song file not found")

    raise HTTPException(status_code=400, detail="No backing track available for export")


async def _run_key_detection(
    project: Project,
    file_path: Path,
    db: Session,
    *,
    key_source: str,
) -> bool:
    try:
        result = await run_in_threadpool(detect_key, str(file_path))
        project.detected_key = result["key"]
        project.mode = result["mode"]
        project.confidence = result["confidence"]
        project.key_source = key_source
        db.commit()
        db.refresh(project)
        return True
    except Exception:
        logger.exception("Key detection failed for project %s", project.project_id)
        return False


@router.post("", response_model=ProjectResponse)
async def create_project(
    file: UploadFile = File(...),
    upload_type: str = Form(...),
    name: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a project from an uploaded full song or instrumental."""
    if upload_type not in UPLOAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"upload_type must be one of: {', '.join(sorted(UPLOAD_TYPES))}",
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lstrip(".").lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    project_id = str(uuid.uuid4())
    saved_name = f"{project_id}.{extension}"
    project_name = name or Path(file.filename).stem

    project = Project(
        project_id=project_id,
        name=project_name,
        upload_type=upload_type,
        status="ready_to_record",
        user_id=current_user.id,
    )

    if upload_type == "full_song":
        file_path = UPLOAD_DIR / saved_name
        file_path.write_bytes(contents)
        project.original_stored_as = saved_name
    else:
        file_path = INSTRUMENTALS_DIR / saved_name
        file_path.write_bytes(contents)
        project.instrumental_stored_as = saved_name

    db.add(project)
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.get("/mine", response_model=list[ProjectResponse])
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return [_project_to_item(project) for project in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)
    return _project_to_item(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a project."""
    project = _get_user_project(project_id, db, current_user)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

    project.name = name
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)
    for take in project.takes:
        _delete_take_files(take)
    _delete_project_files(project)
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.post("/{project_id}/remove-vocals", response_model=ProjectResponse)
async def remove_vocals_for_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)

    if project.upload_type != "full_song":
        raise HTTPException(
            status_code=400,
            detail="Vocal removal is only available for full_song projects",
        )

    if not project.original_stored_as:
        raise HTTPException(status_code=400, detail="No original upload on this project")

    input_path = UPLOAD_DIR / project.original_stored_as
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Original song file not found")

    project.status = "processing"
    db.commit()

    try:
        result = await run_in_threadpool(remove_vocals, str(input_path))
    except Exception as exc:
        project.status = "ready_to_record"
        db.commit()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if project.instrumental_stored_as:
        _unlink_if_exists(INSTRUMENTALS_DIR / project.instrumental_stored_as)

    project.instrumental_stored_as = result["filename"]
    project.status = "ready_to_record"
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.post("/{project_id}/redetect-key", response_model=ProjectResponse)
async def redetect_key_for_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)

    if project.instrumental_stored_as:
        file_path = INSTRUMENTALS_DIR / project.instrumental_stored_as
        key_source = "instrumental"
    elif project.original_stored_as:
        file_path = UPLOAD_DIR / project.original_stored_as
        key_source = "original"
    else:
        raise HTTPException(
            status_code=400,
            detail="No audio file available for key detection",
        )

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    project.status = "processing"
    db.commit()

    await _run_key_detection(project, file_path, db, key_source=key_source)

    project.status = "ready_to_record"
    db.commit()
    db.refresh(project)

    if not project.detected_key:
        raise HTTPException(
            status_code=500,
            detail="Key detection failed — try again or use a different audio file",
        )

    return _project_to_item(project)


@router.post("/{project_id}/vocal", response_model=ProjectResponse)
async def save_vocal_to_project(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lstrip(".").lower() or "webm"
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported vocal file type")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded vocal is empty")

    if project.vocal_stored_as:
        _unlink_if_exists(RECORDINGS_DIR / project.vocal_stored_as)
        _unlink_if_exists(CORRECTED_DIR / project.vocal_stored_as)

    if project.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / project.export_stored_as)
        project.export_stored_as = None

    vocal_name = f"{project.project_id}_vocal.{extension}"
    (RECORDINGS_DIR / vocal_name).write_bytes(contents)

    project.vocal_stored_as = vocal_name
    project.status = "vocal_recorded"
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.delete("/{project_id}/vocal", response_model=ProjectResponse)
def clear_vocal_for_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove saved vocal (and export) so the user can record again."""
    project = _get_user_project(project_id, db, current_user)

    if not project.vocal_stored_as:
        raise HTTPException(status_code=400, detail="No vocal recording on this project")

    _clear_vocal_files(project)

    project.vocal_stored_as = None
    project.export_stored_as = None
    project.status = "ready_to_record"
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.post("/{project_id}/pitch-correct", response_model=ProjectResponse)
async def pitch_correct_project_vocal(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)

    if not project.vocal_stored_as:
        raise HTTPException(status_code=400, detail="Record a vocal before applying auto-tune")

    if not project.detected_key:
        raise HTTPException(
            status_code=400,
            detail="No detected key on this project — run key detection first",
        )

    vocal_path = _resolve_vocal_path(project)

    try:
        result = await run_in_threadpool(
            apply_basic_pitch_correction,
            str(vocal_path),
            project.detected_key,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if project.vocal_stored_as and project.vocal_stored_as != result["filename"]:
        old_corrected = CORRECTED_DIR / project.vocal_stored_as
        if old_corrected.exists():
            old_corrected.unlink()

    project.vocal_stored_as = result["filename"]
    project.status = "tuned"
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.post("/{project_id}/export", response_model=ProjectResponse)
async def export_project_mix(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_user_project(project_id, db, current_user)

    if not project.vocal_stored_as:
        raise HTTPException(status_code=400, detail="Record a vocal before exporting")

    instrumental_path = _resolve_backing_track_path(project)
    vocal_path = _resolve_vocal_path(project)

    try:
        result = await run_in_threadpool(
            mix_audio,
            str(instrumental_path),
            str(vocal_path),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if project.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / project.export_stored_as)

    project.export_stored_as = result["filename"]
    project.status = "exported"
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


# --- Takes: multiple named vocal recordings per project ---


@router.post("/{project_id}/takes", response_model=ProjectResponse)
async def create_take(
    project_id: str,
    file: UploadFile = File(...),
    name: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a new vocal recording as its own take ("Take 1", "Take 2", …)."""
    project = _get_user_project(project_id, db, current_user)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lstrip(".").lower() or "webm"
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported vocal file type")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded vocal is empty")

    take_id = str(uuid.uuid4())
    vocal_name = f"{take_id}_vocal.{extension}"
    (RECORDINGS_DIR / vocal_name).write_bytes(contents)

    take_name = (name or "").strip() or f"Take {len(project.takes) + 1}"

    take = Take(
        take_id=take_id,
        project_id=project.id,
        name=take_name,
        vocal_stored_as=vocal_name,
        is_tuned=False,
    )
    db.add(take)
    db.commit()
    db.refresh(project)

    _sync_project_status(project)
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.patch("/{project_id}/takes/{take_id}", response_model=ProjectResponse)
def rename_take(
    project_id: str,
    take_id: str,
    payload: TakeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a take."""
    project = _get_user_project(project_id, db, current_user)
    take = _get_take(project, take_id)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Take name cannot be empty")

    take.name = name
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.delete("/{project_id}/takes/{take_id}", response_model=ProjectResponse)
def delete_take(
    project_id: str,
    take_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a take and its audio files."""
    project = _get_user_project(project_id, db, current_user)
    take = _get_take(project, take_id)

    _delete_take_files(take)
    db.delete(take)
    db.commit()
    db.refresh(project)

    _sync_project_status(project)
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.post("/{project_id}/takes/{take_id}/pitch-correct", response_model=ProjectResponse)
async def pitch_correct_take(
    project_id: str,
    take_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-tune a take toward the project's detected key."""
    project = _get_user_project(project_id, db, current_user)
    take = _get_take(project, take_id)

    if not project.detected_key:
        raise HTTPException(
            status_code=400,
            detail="No detected key on this project — run key detection first",
        )

    if not take.vocal_stored_as:
        raise HTTPException(status_code=400, detail="This take has no recording")

    raw_path = RECORDINGS_DIR / take.vocal_stored_as
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Take recording not found")

    try:
        result = await run_in_threadpool(
            apply_basic_pitch_correction,
            str(raw_path),
            project.detected_key,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if take.corrected_stored_as and take.corrected_stored_as != result["filename"]:
        _unlink_if_exists(CORRECTED_DIR / take.corrected_stored_as)

    take.corrected_stored_as = result["filename"]
    take.is_tuned = True

    # The vocal changed — any previous export for this take is now stale.
    if take.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / take.export_stored_as)
        take.export_stored_as = None

    db.commit()
    db.refresh(project)

    _sync_project_status(project)
    db.commit()
    db.refresh(project)

    return _project_to_item(project)


@router.post("/{project_id}/takes/{take_id}/export", response_model=ProjectResponse)
async def export_take(
    project_id: str,
    take_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mix a take's vocal (auto-tuned if available) with the backing track to MP3."""
    project = _get_user_project(project_id, db, current_user)
    take = _get_take(project, take_id)

    if not take.vocal_stored_as:
        raise HTTPException(status_code=400, detail="This take has no recording")

    instrumental_path = _resolve_backing_track_path(project)
    vocal_path = _resolve_take_vocal_path(take)

    try:
        result = await run_in_threadpool(
            mix_audio,
            str(instrumental_path),
            str(vocal_path),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if take.export_stored_as:
        _unlink_if_exists(EXPORTS_DIR / take.export_stored_as)

    take.export_stored_as = result["filename"]
    db.commit()
    db.refresh(project)

    _sync_project_status(project)
    db.commit()
    db.refresh(project)

    return _project_to_item(project)
