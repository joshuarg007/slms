# main.py
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List

sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI, Depends, HTTPException, status, Body, BackgroundTasks, Query, Response, Cookie, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
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
from app.api import hubspot
from app.integrations.hubspot import create_contact
from app.api.routes import dashboard


# -----------------------------------
# App & CORS
# -----------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(hubspot.router, prefix="/api")
app.include_router(dashboard.router, tags=["Dashboard"])

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # kept for Bearer fallback


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
        secure=False,   # set True in production (HTTPS)
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,   # set True in production (HTTPS)
        samesite="lax",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")


def get_current_user(
    db: Session = Depends(get_db),
    bearer: str = Depends(oauth2_scheme),                                     # optional Bearer
    access_cookie: Optional[str] = Cookie(default=None, alias="access_token") # preferred cookie
):
    token = access_cookie or bearer or ""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
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


# -----------------------------------
# Signup (assign org by domain)
# -----------------------------------
@app.post("/signup", status_code=201)
def signup(user: UserCreate = Body(...), db: Session = Depends(get_db)):
    from uuid import uuid4
    from sqlalchemy.exc import IntegrityError

    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    if "@" not in user.email or not user.email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    domain = user.email.split("@")[-1].lower()

    org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
    if not org:
        org = models.Organization(name=domain, domain=domain, api_key=uuid4().hex)
        db.add(org)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
        db.refresh(org)

    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        organization_id=org.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "email": new_user.email, "organization_id": org.id}


# -----------------------------------
# Login (cookie auth) — does NOT change org
# -----------------------------------
@app.post("/token", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if user.organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned to this user")

    access = create_access_token(user.email)
    refresh = create_refresh_token(user.email)
    set_auth_cookies(response, access, refresh)
    return {"access_token": access, "token_type": "bearer"}


@app.post("/token/refresh")
def refresh_token(
    response: Response,
    db: Session = Depends(get_db),
    refresh_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
):
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = jwt.decode(refresh_cookie, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token(email)
    set_auth_cookies(response, new_access, refresh_cookie)
    # ⬇️ return the new token so the SPA can update its Bearer header
    return {"access_token": new_access, "token_type": "bearer"}

@app.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@app.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"email": current_user.email}


# -----------------------------------
# Public leads (requires X-Org-Key; server enforces org)
# -----------------------------------
@app.post("/public/leads", response_model=dict)
def public_create_lead(
    lead: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_org_key: Optional[str] = Header(None, alias="X-Org-Key"),
):
    if not x_org_key:
        raise HTTPException(status_code=401, detail="Missing X-Org-Key")

    org = db.query(models.Organization).filter(models.Organization.api_key == x_org_key).first()
    if not org:
        raise HTTPException(status_code=401, detail="Invalid X-Org-Key")

    # enforce tenancy: ignore any client org_id
    lead = LeadCreate(**lead.model_dump(exclude={"organization_id"}), organization_id=org.id)

    db_lead = lead_crud.create_lead(db, lead)

    background_tasks.add_task(
        create_contact,
        email=db_lead.email,
        first_name=getattr(db_lead, "first_name", None),
        last_name=getattr(db_lead, "last_name", None),
        phone=getattr(db_lead, "phone", None),
    )
    return {"message": "Lead received", "lead_id": db_lead.id}


# -----------------------------------
# Leads list (auth) with enforced org isolation + paging/sorting
# -----------------------------------
def _lead_to_dict(l):
    return {
        "id": getattr(l, "id", None),
        "name": getattr(l, "name", None),
        "first_name": getattr(l, "first_name", None),
        "last_name": getattr(l, "last_name", None),
        "email": getattr(l, "email", None),
        "phone": getattr(l, "phone", None),
        "company": getattr(l, "company", None),
        "source": getattr(l, "source", None),
        "notes": getattr(l, "notes", None),
        "organization_id": getattr(l, "organization_id", None),
        "created_at": getattr(l, "created_at", None).isoformat() if getattr(l, "created_at", None) else None,
    }


@app.get("/leads")
def get_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    organization_id = current_user.organization_id
    if organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    items: List[models.Lead] = lead_crud.get_leads(db, organization_id=organization_id)

    if q:
        q_lower = q.lower()

        def _hit(l: models.Lead) -> bool:
            return any(
                (getattr(l, f) or "").lower().find(q_lower) >= 0
                for f in ("email", "name", "first_name", "last_name", "phone", "company", "source", "notes")
            )

        items = [i for i in items if _hit(i)]

    reverse = (dir.lower() == "desc")

    def _key(l: models.Lead):
        v = getattr(l, sort, None)
        return (v is None, v)

    try:
        items.sort(key=_key, reverse=reverse)
    except Exception:
        items.sort(
            key=lambda l: (getattr(l, "created_at", None) is None, getattr(l, "created_at", None)),
            reverse=True,
        )

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return {
        "items": [_lead_to_dict(i) for i in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": end < total,
        "has_prev": page > 1,
        "sort": sort,
        "dir": dir,
        "q": q or "",
        "organization_id": organization_id,
    }


# -----------------------------------
# Dashboard metrics (auth, org-scoped)
# -----------------------------------
@app.get("/dashboard/metrics", response_model=dict)
def dashboard_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    total = db.query(models.Lead).filter(models.Lead.organization_id == org_id).count()
    by_source_rows = (
        db.query(models.Lead.source, sa.func.count(models.Lead.id))
        .filter(models.Lead.organization_id == org_id)
        .group_by(models.Lead.source)
        .all()
    )
    by_source = {k or "unknown": v for k, v in by_source_rows}

    return {"total": total, "by_source": by_source}


# -----------------------------------
# Org key rotate (auth, org-scoped)
# -----------------------------------
from uuid import uuid4

@app.post("/orgs/key/rotate", response_model=dict)
def rotate_org_key(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.api_key = uuid4().hex
    db.add(org)
    db.commit()
    db.refresh(org)
    return {"api_key": org.api_key}
