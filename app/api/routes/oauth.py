# app/api/routes/oauth.py
"""
OAuth 2.0 Authorization Server for Site2CRM.

Implements the Authorization Code flow for Zapier and other integrations.

Endpoints:
- GET /oauth/authorize - Authorization page (user approves access)
- POST /oauth/token - Token exchange (code → tokens, refresh → new tokens)
- GET /oauth/me - Get current user/org info (for testing auth)
"""
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth", tags=["OAuth"])

# Token lifetimes
ACCESS_TOKEN_EXPIRE_HOURS = 24
REFRESH_TOKEN_EXPIRE_DAYS = 30
AUTHORIZATION_CODE_EXPIRE_MINUTES = 10


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_token(length: int = 32) -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(length)


# ============================================================================
# Token Response Model
# ============================================================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds
    refresh_token: Optional[str] = None
    scope: str = "read write"


# ============================================================================
# Authorization Endpoint
# ============================================================================

@router.get("/authorize")
async def authorize(
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    response_type: str = Query(...),
    state: Optional[str] = Query(None),
    scope: str = Query("read write"),
    db: Session = Depends(get_db),
):
    """
    OAuth 2.0 Authorization Endpoint.

    Shows a login/authorization page. After user approves,
    redirects back to the client with an authorization code.
    """
    # Validate client
    client = db.query(models.OAuthClient).filter(
        models.OAuthClient.client_id == client_id,
        models.OAuthClient.is_active == True,
    ).first()

    if not client:
        raise HTTPException(status_code=400, detail="Invalid client_id")

    # Validate redirect URI
    allowed_uris = json.loads(client.redirect_uris)
    if redirect_uri not in allowed_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    if response_type != "code":
        raise HTTPException(status_code=400, detail="Only response_type=code is supported")

    # Return login/authorization HTML page
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authorize {client.name} - Site2CRM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{
                font-family: system-ui, -apple-system, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }}
            .logo {{
                text-align: center;
                margin-bottom: 24px;
            }}
            .logo h1 {{
                font-size: 28px;
                color: #4f46e5;
            }}
            h2 {{
                font-size: 20px;
                color: #1f2937;
                margin-bottom: 8px;
                text-align: center;
            }}
            .client-name {{
                color: #4f46e5;
                font-weight: 600;
            }}
            p {{
                color: #6b7280;
                text-align: center;
                margin-bottom: 24px;
            }}
            .permissions {{
                background: #f3f4f6;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
            }}
            .permissions h3 {{
                font-size: 14px;
                color: #374151;
                margin-bottom: 12px;
            }}
            .permissions ul {{
                list-style: none;
                padding: 0;
            }}
            .permissions li {{
                padding: 8px 0;
                color: #4b5563;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .permissions li::before {{
                content: "\\2713";
                color: #10b981;
                font-weight: bold;
            }}
            form {{ margin-bottom: 16px; }}
            label {{
                display: block;
                font-size: 14px;
                color: #374151;
                margin-bottom: 6px;
                font-weight: 500;
            }}
            input {{
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 16px;
                margin-bottom: 16px;
            }}
            input:focus {{
                outline: none;
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }}
            button {{
                width: 100%;
                padding: 14px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }}
            button:hover {{ background: #4338ca; }}
            .cancel {{
                background: #f3f4f6;
                color: #374151;
                margin-top: 12px;
            }}
            .cancel:hover {{ background: #e5e7eb; }}
            .error {{
                background: #fef2f2;
                color: #dc2626;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 16px;
                display: none;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">
                <h1>Site2CRM</h1>
            </div>
            <h2>Authorize <span class="client-name">{client.name}</span></h2>
            <p>Sign in to connect your Site2CRM account</p>

            <div class="error" id="error"></div>

            <form method="POST" action="/oauth/authorize/submit" id="authForm">
                <input type="hidden" name="client_id" value="{client_id}">
                <input type="hidden" name="redirect_uri" value="{redirect_uri}">
                <input type="hidden" name="state" value="{state or ''}">
                <input type="hidden" name="scope" value="{scope}">

                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="you@company.com">

                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Your password">

                <button type="submit">Authorize {client.name}</button>
            </form>

            <div class="permissions">
                <h3>This will allow {client.name} to:</h3>
                <ul>
                    <li>Read your leads and contacts</li>
                    <li>Create new leads</li>
                    <li>Update existing leads</li>
                    <li>Access your organization info</li>
                </ul>
            </div>

            <form action="{redirect_uri}" method="GET">
                <input type="hidden" name="error" value="access_denied">
                <input type="hidden" name="state" value="{state or ''}">
                <button type="submit" class="cancel">Cancel</button>
            </form>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.post("/authorize/submit")
async def authorize_submit(
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    state: str = Form(""),
    scope: str = Form("read write"),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    """Process the authorization form submission."""
    # Validate client again
    client = db.query(models.OAuthClient).filter(
        models.OAuthClient.client_id == client_id,
        models.OAuthClient.is_active == True,
    ).first()

    if not client:
        raise HTTPException(status_code=400, detail="Invalid client_id")

    # Validate redirect URI
    allowed_uris = json.loads(client.redirect_uris)
    if redirect_uri not in allowed_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    # Authenticate user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        # Return to authorize page with error
        error_redirect = f"/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&state={state}&error=invalid_credentials"
        return RedirectResponse(url=error_redirect, status_code=303)

    # Generate authorization code
    auth_code = generate_token(32)
    expires_at = datetime.utcnow() + timedelta(minutes=AUTHORIZATION_CODE_EXPIRE_MINUTES)

    # Create or update token record with auth code
    token = models.OAuthToken(
        client_id=client.id,
        user_id=user.id,
        organization_id=user.organization_id,
        access_token=generate_token(32),  # Placeholder, will be replaced on exchange
        access_token_expires_at=datetime.utcnow(),  # Placeholder
        authorization_code=auth_code,
        authorization_code_expires_at=expires_at,
        scopes=scope,
    )
    db.add(token)
    db.commit()

    logger.info(f"OAuth authorization code generated for user {user.id}, client {client.name}")

    # Redirect back to client with code
    redirect_url = f"{redirect_uri}?code={auth_code}"
    if state:
        redirect_url += f"&state={state}"

    return RedirectResponse(url=redirect_url, status_code=303)


# ============================================================================
# Token Endpoint
# ============================================================================

@router.post("/token", response_model=TokenResponse)
async def token(
    grant_type: str = Form(...),
    code: Optional[str] = Form(None),
    refresh_token: Optional[str] = Form(None),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    redirect_uri: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    OAuth 2.0 Token Endpoint.

    Supports:
    - grant_type=authorization_code: Exchange auth code for tokens
    - grant_type=refresh_token: Get new access token using refresh token
    """
    # Validate client credentials
    client = db.query(models.OAuthClient).filter(
        models.OAuthClient.client_id == client_id,
        models.OAuthClient.client_secret == client_secret,
        models.OAuthClient.is_active == True,
    ).first()

    if not client:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_client", "error_description": "Invalid client credentials"}
        )

    if grant_type == "authorization_code":
        if not code:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_request", "error_description": "Missing authorization code"}
            )

        # Find and validate authorization code
        token_record = db.query(models.OAuthToken).filter(
            models.OAuthToken.authorization_code == code,
            models.OAuthToken.client_id == client.id,
        ).first()

        if not token_record:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_grant", "error_description": "Invalid authorization code"}
            )

        if token_record.authorization_code_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_grant", "error_description": "Authorization code expired"}
            )

        # Generate new tokens
        access_token = generate_token(32)
        new_refresh_token = generate_token(32)
        access_expires = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        refresh_expires = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        # Update token record
        token_record.access_token = access_token
        token_record.refresh_token = new_refresh_token
        token_record.access_token_expires_at = access_expires
        token_record.refresh_token_expires_at = refresh_expires
        token_record.authorization_code = None  # Clear the code (one-time use)
        token_record.authorization_code_expires_at = None

        db.commit()

        logger.info(f"OAuth tokens issued for user {token_record.user_id}, client {client.name}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            scope=token_record.scopes,
        )

    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_request", "error_description": "Missing refresh token"}
            )

        # Find token record by refresh token
        token_record = db.query(models.OAuthToken).filter(
            models.OAuthToken.refresh_token == refresh_token,
            models.OAuthToken.client_id == client.id,
        ).first()

        if not token_record:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_grant", "error_description": "Invalid refresh token"}
            )

        if token_record.refresh_token_expires_at and token_record.refresh_token_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_grant", "error_description": "Refresh token expired"}
            )

        # Generate new access token (keep same refresh token)
        new_access_token = generate_token(32)
        access_expires = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

        token_record.access_token = new_access_token
        token_record.access_token_expires_at = access_expires

        db.commit()

        logger.info(f"OAuth access token refreshed for user {token_record.user_id}, client {client.name}")

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,  # Return same refresh token
            expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            scope=token_record.scopes,
        )

    else:
        raise HTTPException(
            status_code=400,
            detail={"error": "unsupported_grant_type", "error_description": f"Grant type '{grant_type}' not supported"}
        )


# ============================================================================
# Me Endpoint (for testing authentication)
# ============================================================================

def get_oauth_user(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[models.User, models.Organization]:
    """
    Dependency to get user from OAuth Bearer token.
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Missing or invalid Authorization header"}
        )

    access_token = auth_header[7:]  # Remove "Bearer " prefix

    token_record = db.query(models.OAuthToken).filter(
        models.OAuthToken.access_token == access_token,
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Invalid access token"}
        )

    if token_record.access_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Access token expired"}
        )

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    org = db.query(models.Organization).filter(models.Organization.id == token_record.organization_id).first()

    if not user or not org:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "User or organization not found"}
        )

    return user, org


@router.get("/me")
async def oauth_me(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get current user and organization info.
    Used by Zapier to verify authentication works.
    """
    user, org = get_oauth_user(request, db)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
        },
        "organization": {
            "id": org.id,
            "name": org.name or org.domain,
            "domain": org.domain,
            "plan": org.plan,
        }
    }
