"""
FastAPI application entry point.

Run with: python -m uvicorn app.main:app --reload
Docs at:  http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI

from .auth import router as auth_router
from .database import Base, engine
from . import models  # noqa: F401 — import registers User model with Base

# Create all tables (e.g. `users`) if they do not exist yet.
# models must be imported first so SQLAlchemy knows about them.
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Mount auth routes: /auth/register, /auth/login, /auth/me
app.include_router(auth_router, prefix="/auth")
