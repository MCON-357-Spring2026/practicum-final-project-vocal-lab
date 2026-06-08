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
from .database import Base, engine
from . import models  # noqa: F401 — import registers User model with Base

# Create all tables (e.g. `users`) if they do not exist yet.
# models must be imported first so SQLAlchemy knows about them.
Base.metadata.create_all(bind=engine)

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

# Mount audio routes: /audio/upload, /audio/detect-key
app.include_router(audio_router, prefix="/audio")
app.include_router(recording_router, prefix="/recording")

# Serve uploaded files at /uploads/<filename> (e.g. play in browser).
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/recordings", StaticFiles(directory="recordings"), name="recordings")
