"""
FastAPI application entry point.

Run with: python -m uvicorn app.main:app --reload
Docs at:  http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .audio import router as audio_router
from .auth import router as auth_router
from .config import CORS_ORIGINS
from .projects import router as projects_router
from .recording import router as recording_router
from .storage import (
    CORRECTED_DIR,
    EXPORTS_DIR,
    INSTRUMENTALS_DIR,
    RECORDINGS_DIR,
    UPLOAD_DIR,
)
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

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")
app.mount("/exports", StaticFiles(directory=EXPORTS_DIR), name="exports")
app.mount("/corrected", StaticFiles(directory=CORRECTED_DIR), name="corrected")
app.mount("/instrumentals", StaticFiles(directory=INSTRUMENTALS_DIR), name="instrumentals")
