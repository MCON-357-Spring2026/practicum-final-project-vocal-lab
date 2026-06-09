import os
import shutil
import subprocess
import sys
import uuid

INSTRUMENTALS_DIR = "instrumentals"
os.makedirs(INSTRUMENTALS_DIR, exist_ok=True)


def remove_vocals(input_file_path: str):
    if not os.path.exists(input_file_path):
        raise FileNotFoundError("Input audio file not found")

    output_folder = f"demucs_output_{uuid.uuid4()}"

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

    accompaniment_path = os.path.join(
        output_folder,
        "htdemucs",
        song_name,
        "no_vocals.wav"
    )

    if not os.path.exists(accompaniment_path):
        raise FileNotFoundError("Instrumental output was not created")

    final_filename = f"{uuid.uuid4()}_instrumental.wav"
    final_path = os.path.join(INSTRUMENTALS_DIR, final_filename)

    shutil.copy(accompaniment_path, final_path)
    shutil.rmtree(output_folder, ignore_errors=True)

    return {
        "filename": final_filename,
        "file_path": final_path
    }
