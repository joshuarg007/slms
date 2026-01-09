# app/api/routes/google_auth.py
"""
Google OAuth 2.0 for user authentication (Social Login).

Flow:
1. User clicks "Sign in with Google" -> /auth redirects to Google
2. User authorizes -> Google redirects to /callback with code
3. We exchange code for tokens, get user info, create/login user
"""
from __future__ import annotations

import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.session import SessionLocal
from app.db import models

router = APIRouter(prefix="/auth/google", tags=["Auth: Google"])

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Scopes for basic profile info
GOOGLE_SCOPES = ["openid", "email", "profile"]


def _get_redirect_uri() -> str:
    """Get the callback URL for Google OAuth."""
    base = (settings.api_base_url or "https://api.site2crm.io").rstrip("/")
    return f"{base}/api/auth/google/callback"


def _require_google_env() -> None:
    """Raise if Google OAuth is not configured."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=501,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )


@router.get("/login")
def google_login():
    """
    Redirect user to Google for authentication.
    """
    _require_google_env()

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _get_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }

    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    response = RedirectResponse(url=url)
    # Store state in cookie for verification
    response.set_cookie(
        key="google_oauth_state",
        value=state,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=600,  # 10 minutes
    )
    return response


@router.get("/callback")
async def google_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """
    Handle Google OAuth callback.
    Exchange code for tokens, get user info, create/login user.
    """
    _require_google_env()

    if error:
        # Redirect to frontend with error
        frontend_url = settings.frontend_base_url or "https://site2crm.io"
        return RedirectResponse(url=f"{frontend_url}/login?error=google_denied")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": _get_redirect_uri(),
            },
        )

        if token_response.status_code != 200:
            frontend_url = settings.frontend_base_url or "https://site2crm.io"
            return RedirectResponse(url=f"{frontend_url}/login?error=google_token_failed")

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        if not access_token:
            frontend_url = settings.frontend_base_url or "https://site2crm.io"
            return RedirectResponse(url=f"{frontend_url}/login?error=google_no_token")

        # Get user info
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            frontend_url = settings.frontend_base_url or "https://site2crm.io"
            return RedirectResponse(url=f"{frontend_url}/login?error=google_userinfo_failed")

        userinfo = userinfo_response.json()

    email = userinfo.get("email")
    if not email:
        frontend_url = settings.frontend_base_url or "https://site2crm.io"
        return RedirectResponse(url=f"{frontend_url}/login?error=google_no_email")

    # Check if user exists or create new one
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email.lower()).first()

        if not user:
            # Create new user and organization
            org = models.Organization(
                name=userinfo.get("name", email.split("@")[0]) + "'s Organization",
                plan="free",
            )
            db.add(org)
            db.flush()

            # Generate random password (user won't need it with Google login)
            random_password = secrets.token_urlsafe(32)

            user = models.User(
                email=email.lower(),
                hashed_password=get_password_hash(random_password),
                organization_id=org.id,
                role="OWNER",
                is_default=True,
                email_verified=True,  # Google already verified the email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update email_verified if not already
            if not getattr(user, "email_verified", False):
                user.email_verified = True
                db.commit()

        # Create JWT token
        jwt_token = create_access_token(data={"sub": user.email})

        # Redirect to frontend with token
        frontend_url = settings.frontend_base_url or "https://site2crm.io"

        # Redirect to a special page that will store the token
        redirect_url = f"{frontend_url}/auth/google/success?token={jwt_token}"

        response = RedirectResponse(url=redirect_url)
        return response

    finally:
        db.close()
