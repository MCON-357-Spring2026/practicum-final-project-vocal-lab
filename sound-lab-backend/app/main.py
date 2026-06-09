"""
FastAPI application entry point.

Run with: python -m uvicorn app.main:app --reload
Docs at:  http://127.0.0.1:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .auth import router as auth_router
from .audio import router as audio_router
from .recording import router as recording_router
from . import models  # noqa: F401 — registers models with Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Allow the Vite dev server to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(audio_router, prefix="/audio")
app.include_router(recording_router, prefix="/recording")

for directory in ("uploads", "recordings", "instrumentals", "exports", "corrected"):
    os.makedirs(directory, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/recordings", StaticFiles(directory="recordings"), name="recordings")
app.mount("/instrumentals", StaticFiles(directory="instrumentals"), name="instrumentals")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")
app.mount("/corrected", StaticFiles(directory="corrected"), name="corrected")
