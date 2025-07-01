# Smart Lead Management System (SLMS)

SLMS is a backend system for managing incoming sales leads. It supports lead intake, assignment to sales reps, and basic analytics. Built using FastAPI, PostgreSQL, SQLAlchemy, and Pydantic.

## Features

- FastAPI REST API with Swagger docs  
- PostgreSQL database integration  
- SQLAlchemy models and Pydantic schemas  
- Modular structure for easy scaling and AWS migration  
- Ready for Docker deployment

## Getting Started

### Requirements

- Python 3.10+  
- PostgreSQL (local instance with a `slms_local` database)  
- `venv` or another Python environment manager  

### Setup

```bash
# Clone the repo and enter project directory
git clone https://github.com/YOUR_USERNAME/slms.git
cd slms

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate   # or source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn slms.main:app --reload
