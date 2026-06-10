from pydub import AudioSegment
import os
import uuid

EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


def mix_audio(instrumental_path: str, vocal_path: str):
    instrumental = AudioSegment.from_file(instrumental_path)
    vocals = AudioSegment.from_file(vocal_path)

    min_length = min(len(instrumental), len(vocals))

    instrumental = instrumental[:min_length]
    vocals = vocals[:min_length]

    mixed = instrumental.overlay(vocals)

    filename = f"{uuid.uuid4()}.mp3"
    output_path = os.path.join(EXPORT_DIR, filename)

    mixed.export(output_path, format="mp3")

    return {
        "filename": filename,
        "file_path": output_path
    }
