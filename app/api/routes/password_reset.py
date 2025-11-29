"""
Password reset endpoints
"""
import os
from datetime import datetime, timedelta
from typing import Optional
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from jose import jwt

from app.db.session import SessionLocal
from app.db import models
from app.core.security import get_password_hash
from app.core.rate_limit import check_rate_limit
from app.services.email import send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_HOURS = 24
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://site2crm.io")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


def create_reset_token(email: str) -> str:
    """Create a password reset token"""
    expire = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": email, "exp": expire, "type": "password_reset"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def verify_reset_token(token: str) -> Optional[str]:
    """Verify reset token and return email if valid"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except Exception:
        return None


@router.post("/forgot-password")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    Rate limited to 5 requests per hour per IP.
    """
    # Check rate limit
    check_rate_limit(request, "forgot_password")
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if user:
        # Generate reset token
        token = create_reset_token(data.email)
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

        # Send email in background
        background_tasks.add_task(send_password_reset_email, data.email, reset_url)

    # Always return success to prevent email enumeration
    return {
        "status": "ok",
        "message": "If an account exists with this email, you will receive a password reset link.",
    }


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset password using token from email.
    """
    # Verify token
    email = verify_reset_token(data.token)
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please request a new password reset.",
        )

    # Find user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # Validate password
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters",
        )

    # Update password
    user.hashed_password = get_password_hash(data.password)
    db.commit()

    logger.info(f"Password reset successful for {email}")

    return {"status": "ok", "message": "Password has been reset successfully."}
