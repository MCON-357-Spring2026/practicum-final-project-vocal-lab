from fastapi import APIRouter, UploadFile, File
import os
import uuid

router = APIRouter()

RECORDINGS_DIR = "recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)


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
