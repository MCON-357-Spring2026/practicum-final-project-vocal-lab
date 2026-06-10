"""
Environment-backed settings for local dev and production.

Load a `.env` file from the backend root (see `.env.example`).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sound_lab.db")

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me")

_DEFAULT_CORS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,"
    "http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177"
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", _DEFAULT_CORS).split(",")
    if origin.strip()
]


def engine_kwargs() -> dict:
    """SQLite needs check_same_thread=False; PostgreSQL does not."""
    if DATABASE_URL.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}
