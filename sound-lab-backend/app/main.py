"""
FastAPI application entry point.

Run with: python -m uvicorn app.main:app --reload
Docs at:  http://127.0.0.1:8000/docs
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .audio import router as audio_router
from .auth import router as auth_router
from .recording import router as recording_router
from . import models  # noqa: F401 — import registers models for Alembic

# Tables are managed by Alembic migrations (see alembic/versions/).
# Run: python -m alembic upgrade head

app = FastAPI()

# Allow the Vite dev server to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount auth routes: /auth/register, /auth/login, /auth/me
app.include_router(auth_router, prefix="/auth")

# Mount audio routes: upload, key detect, remove-vocals, redetect-key, mix
app.include_router(audio_router, prefix="/audio")

# Mount browser recording save: /recording/save
app.include_router(recording_router, prefix="/recording")

# Serve uploaded files at /uploads/<filename> (e.g. play in browser).
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Partner routes: serve saved browser recordings and mixed exports.
RECORDINGS_DIR = Path(__file__).resolve().parent.parent / "recordings"
EXPORTS_DIR = Path(__file__).resolve().parent.parent / "exports"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")
app.mount("/exports", StaticFiles(directory=EXPORTS_DIR), name="exports")
# Vocal-removed tracks (linked from Recording.instrumental_stored_as).
INSTRUMENTALS_DIR = Path(__file__).resolve().parent.parent / "instrumentals"
INSTRUMENTALS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/instrumentals", StaticFiles(directory=INSTRUMENTALS_DIR), name="instrumentals")
