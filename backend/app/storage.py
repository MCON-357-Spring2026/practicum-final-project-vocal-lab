"""Upload and export directories (local backend root or Render persistent disk)."""

from pathlib import Path

from .config import BASE_STORAGE_DIR

STORAGE_ROOT = Path(BASE_STORAGE_DIR).resolve()

UPLOAD_DIR = STORAGE_ROOT / "uploads"
INSTRUMENTALS_DIR = STORAGE_ROOT / "instrumentals"
RECORDINGS_DIR = STORAGE_ROOT / "recordings"
CORRECTED_DIR = STORAGE_ROOT / "corrected"
EXPORTS_DIR = STORAGE_ROOT / "exports"


def ensure_storage_dirs() -> None:
    for directory in (
        UPLOAD_DIR,
        INSTRUMENTALS_DIR,
        RECORDINGS_DIR,
        CORRECTED_DIR,
        EXPORTS_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)


ensure_storage_dirs()
