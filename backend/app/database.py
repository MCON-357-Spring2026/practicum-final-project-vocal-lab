"""
Database connection setup.

Other modules import `engine`, `SessionLocal`, and `Base` from here.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL, engine_kwargs

engine = create_engine(DATABASE_URL, **engine_kwargs())

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
