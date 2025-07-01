import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Get the DATABASE_URL from the .env file
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate DATABASE_URL
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file.")

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()
