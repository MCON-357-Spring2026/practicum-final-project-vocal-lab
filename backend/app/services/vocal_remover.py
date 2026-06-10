"""
Separate vocals from a song using Demucs (two-stem mode).

Output is copied to sound-lab-backend/instrumentals/ for serving and key re-detect.
"""

import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

# Absolute path so Demucs works regardless of server working directory.
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
INSTRUMENTALS_DIR = BACKEND_ROOT / "instrumentals"
INSTRUMENTALS_DIR.mkdir(parents=True, exist_ok=True)


def remove_vocals(input_file_path: str):
    """Split input into vocals + accompaniment; return path to the instrumental WAV."""
    if not os.path.exists(input_file_path):
        raise FileNotFoundError("Input audio file not found")

    # Temporary folder; deleted after we copy the instrumental out.
    output_folder = f"demucs_output_{uuid.uuid4()}"

    # --two-stems=vocals → outputs no_vocals.wav (instrumental) + vocals.wav
    command = [
        sys.executable,
        "-m",
        "demucs",
        "--two-stems=vocals",
        "-o",
        output_folder,
        input_file_path,
    ]

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        error = result.stderr.strip() or result.stdout.strip() or "Demucs failed"
        raise RuntimeError(error)

    song_name = os.path.splitext(os.path.basename(input_file_path))[0]

    # Demucs always nests output under htdemucs/<input_basename>/.
    accompaniment_path = os.path.join(
        output_folder,
        "htdemucs",
        song_name,
        "no_vocals.wav"
    )

    if not os.path.exists(accompaniment_path):
        raise FileNotFoundError("Instrumental output was not created")

    # Permanent name stored on Recording.instrumental_stored_as in the API layer.
    final_filename = f"{uuid.uuid4()}_instrumental.wav"
    final_path = INSTRUMENTALS_DIR / final_filename

    shutil.copy(accompaniment_path, final_path)
    shutil.rmtree(output_folder, ignore_errors=True)

    return {
        "filename": final_filename,
        "file_path": str(final_path),
    }
