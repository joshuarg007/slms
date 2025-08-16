import sys
import os

sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.db.session import SessionLocal, engine
from app.db import models
from app.schemas.lead import LeadCreate
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.crud import lead as lead_crud
from app.api import hubspot
from app.integrations.hubspot import create_contact
from app.api.routes import dashboard

# Initialize FastAPI app
app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include other routers
app.include_router(hubspot.router, prefix="/api")
app.include_router(dashboard.router, tags=["Dashboard"])

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Auth config
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Password helpers
def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# Auth helpers
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# User registration
@app.post("/signup", status_code=201)
def signup(user: UserCreate = Body(...), db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "email": new_user.email}

# Login route
@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# Public lead submission with HubSpot sync in background (sync endpoint, sync CRUD)
@app.post("/public/leads", response_model=dict)
def create_lead(
    lead: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    db_lead = lead_crud.create_lead(db=db, lead=lead)  # no await

    background_tasks.add_task(
        create_contact,
        email=db_lead.email,
        first_name=db_lead.first_name,
        last_name=db_lead.last_name,
        phone=db_lead.phone,
    )

    return {"message": "Lead received", "lead_id": db_lead.id}

# Dashboard metrics for authenticated users
@app.get("/dashboard/metrics", response_model=dict)
def get_dashboard_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metrics = lead_crud.get_lead_metrics(db)
    return metrics

# Authenticated lead viewer
@app.get("/leads")
def get_leads(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    leads = db.query(models.Lead).all()
    return leads

# Delete a lead by ID (requires authentication)
@app.delete("/leads/{lead_id}", response_model=dict)
def delete_lead(
    lead_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()
    return {"message": f"Lead {lead_id} deleted"}
