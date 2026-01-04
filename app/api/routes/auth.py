from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.schemas.token import Token
from app.core import security
from app.core.rate_limit import check_rate_limit

router = APIRouter()

# Local DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Bearer fallback
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not security.verify_password(password, user.hashed_password):
        return None
    return user

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

    email = security.decode_access_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/token", response_model=Token)
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Rate limit: 10 attempts per 5 minutes per IP
    check_rate_limit(request, "login")

    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if user.organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned to this user")

    # Check email verification
    email_verified = getattr(user, "email_verified", True)  # Default to True for existing users
    if not email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    access = security.create_access_token(user.email)
    refresh = security.create_refresh_token(user.email)
    security.set_auth_cookies(response, access, refresh)
    return {"access_token": access, "token_type": "bearer"}

@router.post("/token/refresh")
def refresh_token(
    response: Response,
    db: Session = Depends(get_db),
    refresh_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
):
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = jwt.decode(refresh_cookie, security.SECRET_KEY, algorithms=[security.ALGORITHM])
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

    new_access = security.create_access_token(email)
    security.set_auth_cookies(response, new_access, refresh_cookie)
    return {"access_token": new_access, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    security.clear_auth_cookies(response)
    return {"ok": True}

@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"email": current_user.email}
