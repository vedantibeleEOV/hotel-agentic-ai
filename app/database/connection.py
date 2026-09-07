from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.database.base import Base

# SQLAlchemy 2.x engine initialized with pool_pre_ping for connection health checking
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=False,
)

# Session factory for generating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session and safely closing it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
