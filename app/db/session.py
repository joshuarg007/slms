import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read from DATABASE_URL env var, fallback to SQLite for local dev
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")

# SQLite needs check_same_thread=False, PostgreSQL needs connection pooling
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Production PostgreSQL settings with connection pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,           # Number of persistent connections
        max_overflow=40,        # Extra connections when pool exhausted
        pool_pre_ping=True,     # Test connections before use (handles stale)
        pool_recycle=1800,      # Recycle connections after 30 min
        pool_timeout=30,        # Wait max 30s for a connection
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

# Dependency for routes — yields a DB session and closes it after use
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
