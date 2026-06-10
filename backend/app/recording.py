from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import uuid

from .services.pitch_correction import apply_basic_pitch_correction

router = APIRouter()

RECORDINGS_DIR = "recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)


class PitchCorrectionRequest(BaseModel):
    vocal_path: str
    song_key: str


@router.post("/save")
async def save_recording(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1] if "." in file.filename else "webm"

    filename = f"{file_id}.{extension}"
    file_path = os.path.join(RECORDINGS_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {
        "message": "Recording saved successfully",
        "file_id": file_id,
        "filename": filename,
        "file_path": file_path
    }


@router.post("/pitch-correct")
def pitch_correct_recording(request: PitchCorrectionRequest):
    if not os.path.exists(request.vocal_path):
        raise HTTPException(status_code=404, detail="Vocal file not found")

    try:
        result = apply_basic_pitch_correction(
            vocal_path=request.vocal_path,
            song_key=request.song_key
        )

        return {
            "message": "Pitch correction applied",
            "filename": result["filename"],
            "file_path": result["file_path"],
            "semitone_shift": result["semitone_shift"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
