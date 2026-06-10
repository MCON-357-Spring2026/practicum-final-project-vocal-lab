"""
Database connection setup.

This file configures SQLAlchemy to talk to a local SQLite file.
Other modules import `engine`, `SessionLocal`, and `Base` from here.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite file path (created in the project folder when the app first writes data).
DATABASE_URL = "sqlite:///./sound_lab.db"

# `engine` is the low-level connection pool to the database.
# `check_same_thread=False` is required for SQLite when using FastAPI (multiple threads).
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# `SessionLocal` is a factory: each call creates a new DB session for one request.
# autocommit=False / autoflush=False gives us explicit control over commits.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# `Base` is the parent class for all SQLAlchemy models (see models.py).
Base = declarative_base()
