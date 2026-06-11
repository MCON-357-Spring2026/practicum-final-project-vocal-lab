"""Mix instrumental + vocal and export MP3 (no system ffmpeg required)."""

import os
import subprocess
import tempfile
import uuid
from pathlib import Path

import imageio_ffmpeg
import lameenc
import librosa
import numpy as np
import soundfile as sf

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
EXPORT_DIR = BACKEND_ROOT / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

_FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
_WEBM_LIKE = {".webm", ".m4a", ".mp4", ".aac"}


def _load_audio(path: str) -> tuple[np.ndarray, int]:
    """Load audio as mono float32. WebM/M4A decoded via bundled ffmpeg."""
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")

    extension = file_path.suffix.lower()
    if extension in _WEBM_LIKE:
        return _load_via_ffmpeg(file_path)

    try:
        audio, sample_rate = librosa.load(str(file_path), sr=None, mono=True)
        return audio, int(sample_rate)
    except Exception as exc:
        if extension in {".mp3"}:
            return _load_via_ffmpeg(file_path)
        raise exc


def _load_via_ffmpeg(file_path: Path) -> tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [_FFMPEG, "-y", "-i", str(file_path), "-ac", "1", tmp_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "ffmpeg decode failed").strip()
            raise RuntimeError(detail)

        audio, sample_rate = sf.read(tmp_path, dtype="float32", always_2d=False)
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return audio, int(sample_rate)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _write_mp3(output_path: Path, audio: np.ndarray, sample_rate: int) -> None:
    clipped = np.clip(audio, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(192)
    encoder.set_in_sample_rate(int(sample_rate))
    encoder.set_channels(1)
    encoder.set_quality(2)

    mp3_bytes = encoder.encode(pcm.tobytes()) + encoder.flush()
    output_path.write_bytes(mp3_bytes)


def mix_audio(instrumental_path: str, vocal_path: str) -> dict:
    """Overlay vocal on instrumental and write an MP3 under exports/."""
    instrumental, inst_sr = _load_audio(instrumental_path)
    vocal, vocal_sr = _load_audio(vocal_path)

    if vocal_sr != inst_sr:
        vocal = librosa.resample(vocal, orig_sr=vocal_sr, target_sr=inst_sr)

    min_length = min(len(instrumental), len(vocal))
    instrumental = instrumental[:min_length]
    vocal = vocal[:min_length]

    mixed = np.clip(0.75 * instrumental + 0.95 * vocal, -1.0, 1.0)

    filename = f"{uuid.uuid4()}.mp3"
    output_path = EXPORT_DIR / filename
    _write_mp3(output_path, mixed, inst_sr)

    return {
        "filename": filename,
        "file_path": str(output_path),
    }
