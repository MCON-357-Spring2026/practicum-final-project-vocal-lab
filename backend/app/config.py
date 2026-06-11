import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./music.db")
# Render Postgres URLs use postgres://; SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
BASE_STORAGE_DIR = os.getenv("STORAGE_DIR", ".")


def engine_kwargs() -> dict:
    """SQLite needs check_same_thread=False; PostgreSQL does not."""
    if DATABASE_URL.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}
