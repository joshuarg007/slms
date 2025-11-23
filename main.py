# main.py
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List

sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI, Depends, HTTPException, status, Body, BackgroundTasks, Query, Response, Cookie, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy.orm import Session
import sqlalchemy as sa
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.db.session import SessionLocal, engine
from app.db import models
from app.schemas.lead import LeadCreate
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.crud import lead as lead_crud
from app.integrations.hubspot import create_contact
from app.api.routes.integrations_current import router as integrations_current_router
from app.api.routes import dashboard
from app.api.routes.hubspot_stats import router as hubspot_stats_router  
from app.api.routes.public_leads import router as public_leads_router
from app.api.routes.pipedrive_stats import router as pipedrive_stats_router
from app.api.routes import reports
from app.api.routes import integrations
from app.api.routes.integrations_update import router as integrations_update_router
from app.api.routes.integrations_notifications import router as integrations_notifications_router
from app.api.routes import salesforce
from app.api.routes.salespeople_stats_unified import router as salespeople_unified_router
from app.api.routes.salespeople_stats import router as salespeople_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import core as core_routes
from app.api.routes import orgs as orgs_routes
from app.api.routes import leads as leads_routes
from app.api.routes import auth as auth_routes
from app.api.routes import billing as billing_routes
from app.core.security import ( 
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    decode_access_token,
)

# -----------------------------------
# App & CORS
# -----------------------------------
app = FastAPI()

raw_origins = os.getenv("ALLOWED_ORIGINS")

if raw_origins and raw_origins.strip():
    ALLOWED_ORIGINS = [
        o.strip()
        for o in raw_origins.split(",")
        if o.strip()
    ]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "https://site2crm.io",
        "https://www.site2crm.io",
        "https://api.site2crm.io",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers

app.include_router(billing_routes.router, prefix="/api", tags=["Billing"])
app.include_router(core_routes.router)
app.include_router(orgs_routes.router, prefix="/api", tags=["Orgs"])
app.include_router(leads_routes.router, prefix="/api", tags=["Leads"])
app.include_router(auth_routes.router, prefix="/api", tags=["Auth"])
app.include_router(hubspot_stats_router, prefix="/api", tags=["HubSpot"])
app.include_router(pipedrive_stats_router, prefix="/api", tags=["Pipedrive"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(integrations.router, prefix="/api", tags=["Integrations"])
app.include_router(salesforce.router, prefix="/api", tags=["Salesforce"])
#app.include_router(salespeople_unified_router, prefix="/api", tags=["Salespeople"])
app.include_router(salespeople_router, prefix="/api", tags=["Salespeople"])
app.include_router(integrations_current_router, prefix="/api", tags=["Integrations"])
app.include_router(integrations_update_router, prefix="/api", tags=["Integrations"])
app.include_router(integrations_notifications_router, prefix="/api", tags=["Integrations"])

# DB
models.Base.metadata.create_all(bind=engine)

# -----------------------------------
# Auth setup (cookie-based)
# -----------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)  # kept for Bearer fallback

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(sub: str, expires_delta: Optional[timedelta] = None):
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode({"sub": sub, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(sub: str, expires_delta: Optional[timedelta] = None):
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return jwt.encode({"sub": sub, "exp": expire, "typ": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)

def set_auth_cookies(resp: Response, access_token: str, refresh_token: str):
    resp.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,        # required for SameSite="none" on modern browsers
        samesite="none",    # allow cross site from site2crm.io to api.site2crm.io
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )

def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")

def get_current_user(
    db: Session = Depends(get_db),
    bearer: Optional[str] = Depends(oauth2_scheme),
    access_cookie: Optional[str] = Cookie(None, alias="access_token"),
):
    token = access_cookie or bearer or ""
    if hasattr(token, "value"):
        token = token.value
    if not isinstance(token, str):
        token = str(token)

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    email = decode_access_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
# ci: trigger deploy
