import logging
from datetime import datetime, timedelta
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

logger = logging.getLogger(__name__)

# Security constants
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

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

def get_client_ip(request: Request) -> str:
    """Extract client IP, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not security.verify_password(password, user.hashed_password):
        return None
    return user


def check_account_lockout(user: models.User) -> tuple[bool, int]:
    """Check if account is locked. Returns (is_locked, seconds_remaining)."""
    if not user.locked_until:
        return False, 0

    now = datetime.utcnow()
    if user.locked_until > now:
        remaining = int((user.locked_until - now).total_seconds())
        return True, remaining
    return False, 0


def record_failed_login(db: Session, user: models.User, ip: str):
    """Record a failed login attempt and potentially lock the account."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        logger.warning(
            f"Account locked: email={user.email}, ip={ip}, "
            f"attempts={user.failed_login_attempts}, locked_for={LOCKOUT_DURATION_MINUTES}min"
        )

    db.commit()
    logger.info(f"Failed login: email={user.email}, ip={ip}, attempts={user.failed_login_attempts}")


def record_successful_login(db: Session, user: models.User, ip: str):
    """Record a successful login, reset failed attempts."""
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = ip
    db.commit()
    logger.info(f"Successful login: email={user.email}, ip={ip}")

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

    client_ip = get_client_ip(request)

    # First check if user exists (for lockout check)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # Check account lockout before attempting authentication
    if user:
        is_locked, seconds_remaining = check_account_lockout(user)
        if is_locked:
            minutes_remaining = (seconds_remaining // 60) + 1
            logger.warning(f"Login attempt on locked account: email={user.email}, ip={client_ip}")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account temporarily locked due to too many failed attempts. Try again in {minutes_remaining} minutes."
            )

    # Attempt authentication
    authenticated_user = authenticate_user(db, form_data.username, form_data.password)

    if not authenticated_user:
        # Log failed attempt
        if user:
            record_failed_login(db, user, client_ip)
        else:
            logger.info(f"Failed login (unknown user): email={form_data.username}, ip={client_ip}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if authenticated_user.organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned to this user")

    # Check email verification
    email_verified = getattr(authenticated_user, "email_verified", True)
    if not email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    # Record successful login
    record_successful_login(db, authenticated_user, client_ip)

    access = security.create_access_token(authenticated_user.email)
    refresh = security.create_refresh_token(authenticated_user.email)
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
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch organization for onboarding status
    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()

    return {
        "email": current_user.email,
        "role": current_user.role,
        "is_approved": current_user.is_approved,
        "email_verified": current_user.email_verified,
        "cookie_consent": current_user.cookie_consent_at is not None,
        "organization": {
            "id": org.id if org else None,
            "name": org.name if org else None,
            "onboarding_completed": org.onboarding_completed if org else False,
            "plan": org.plan if org else "free",
            "trial_ends_at": org.trial_ends_at.isoformat() if org and org.trial_ends_at else None,
        } if org else None,
    }


@router.post("/cookie-consent")
def set_cookie_consent(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record that user has accepted cookie consent."""
    from datetime import datetime
    current_user.cookie_consent_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "cookie_consent": True}
