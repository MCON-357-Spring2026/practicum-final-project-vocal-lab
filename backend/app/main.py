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
from .config import CORS_ORIGINS
from .projects import router as projects_router
from .recording import router as recording_router
from . import models  # noqa: F401 — import registers models for Alembic

# Tables are managed by Alembic migrations (see alembic/versions/).
# Run: python -m alembic upgrade head

app = FastAPI()

# Origins from CORS_ORIGINS env (comma-separated). See .env.example.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")

# Project-based studio workflow (see docs/API_CONTRACT.md).
app.include_router(projects_router, prefix="/projects")

# Legacy audio routes (deprecated — use /projects).
app.include_router(audio_router, prefix="/audio")

# Mount browser recording save: /recording/save
app.include_router(recording_router, prefix="/recording")

BACKEND_ROOT = Path(__file__).resolve().parent.parent

# Serve uploaded files at /uploads/<filename> (e.g. play in browser).
UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Partner routes: serve saved browser recordings and mixed exports.
RECORDINGS_DIR = BACKEND_ROOT / "recordings"
EXPORTS_DIR = BACKEND_ROOT / "exports"
CORRECTED_DIR = BACKEND_ROOT / "corrected"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
CORRECTED_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")
app.mount("/exports", StaticFiles(directory=EXPORTS_DIR), name="exports")
app.mount("/corrected", StaticFiles(directory=CORRECTED_DIR), name="corrected")

# Vocal-removed tracks (linked from Recording.instrumental_stored_as).
INSTRUMENTALS_DIR = BACKEND_ROOT / "instrumentals"
INSTRUMENTALS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/instrumentals", StaticFiles(directory=INSTRUMENTALS_DIR), name="instrumentals")
