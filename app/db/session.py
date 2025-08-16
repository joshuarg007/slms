from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Replace with your actual DB URL (use PostgreSQL if deployed)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"  # SQLite for local dev

# If using SQLite, add connect_args; remove if using PostgreSQL
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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
