# app/api/routes/pipedrive_oauth.py
"""
Pipedrive OAuth 2.0 integration for Site2CRM.

Flow:
1. User clicks "Connect Pipedrive" -> /auth redirects to Pipedrive
2. User authorizes -> Pipedrive redirects to /callback with code
3. We exchange code for tokens and store in IntegrationCredential
"""
from __future__ import annotations

import base64
import json
import logging
import secrets
from typing import Optional, Dict, Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Cookie, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.core.config import settings
from app.core.security import COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN
from app.db import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/pipedrive", tags=["Integrations: Pipedrive"])

# Pipedrive OAuth URLs
PIPEDRIVE_AUTH_URL = "https://oauth.pipedrive.com/oauth/authorize"
PIPEDRIVE_TOKEN_URL = "https://oauth.pipedrive.com/oauth/token"


def _require_pipedrive_env() -> None:
    """Ensure Pipedrive OAuth is configured."""
    if not settings.pipedrive_client_id or not settings.pipedrive_client_secret:
        raise HTTPException(
            status_code=400,
            detail="Pipedrive OAuth not configured. Set PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET."
        )
    if not settings.pipedrive_redirect_uri:
        raise HTTPException(
            status_code=400,
            detail="Pipedrive redirect URI not configured. Set PIPEDRIVE_REDIRECT_URI."
        )


def _success_redirect() -> str:
    """Redirect URL on successful OAuth."""
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/app/integrations?pipedrive=connected"


def _error_redirect(code: str, message: str = "") -> str:
    """Redirect URL on OAuth error."""
    base = settings.frontend_base_url.rstrip("/")
    params = {"pipedrive_error": code}
    if message:
        params["message"] = message[:100]  # Truncate long messages
    return f"{base}/app/integrations?{urlencode(params)}"


def _encode_state(data: dict) -> str:
    """Encode state as URL-safe base64 (more reliable than raw JSON)."""
    json_str = json.dumps(data)
    return base64.urlsafe_b64encode(json_str.encode()).decode()


def _decode_state(state: str) -> dict:
    """Decode base64-encoded state back to dict."""
    try:
        json_str = base64.urlsafe_b64decode(state.encode()).decode()
        return json.loads(json_str)
    except Exception:
        return {}


@router.get("/auth")
def pipedrive_auth_start(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Start Pipedrive OAuth flow.
    Redirects user to Pipedrive authorization page.
    """
    _require_pipedrive_env()

    # Verify user has an organization
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Generate a random nonce and store org_id in state
    nonce = secrets.token_urlsafe(16)
    state_data = {"org_id": org.id, "user_id": user.id, "nonce": nonce}
    state = _encode_state(state_data)

    logger.info(f"Pipedrive OAuth started: org_id={org.id}, user_id={user.id}")

    params = {
        "client_id": settings.pipedrive_client_id,
        "redirect_uri": settings.pipedrive_redirect_uri,
        "state": state,
    }
    url = f"{PIPEDRIVE_AUTH_URL}?{urlencode(params)}"

    response = RedirectResponse(url, status_code=307)

    # Store state in cookie as fallback
    cookie_kwargs = {
        "httponly": True,
        "secure": COOKIE_SECURE,
        "samesite": COOKIE_SAMESITE,
        "max_age": 600,  # 10 minutes
        "path": "/",
    }
    if COOKIE_DOMAIN:
        cookie_kwargs["domain"] = COOKIE_DOMAIN
    response.set_cookie(key="pipedrive_oauth_state", value=state, **cookie_kwargs)

    return response


@router.get("/callback")
async def pipedrive_auth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    pipedrive_oauth_state: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Handle Pipedrive OAuth callback.
    Exchange authorization code for access/refresh tokens.
    """
    _require_pipedrive_env()

    # Handle errors from Pipedrive
    if error:
        logger.warning(f"Pipedrive OAuth error: {error} - {error_description}")
        return RedirectResponse(
            _error_redirect(error, error_description or ""),
            status_code=307
        )

    if not code:
        logger.warning("Pipedrive OAuth callback missing code")
        return RedirectResponse(
            _error_redirect("missing_code", "No authorization code received"),
            status_code=307
        )

    # Try URL state first, fall back to cookie
    effective_state = state or pipedrive_oauth_state
    logger.info(f"Pipedrive OAuth callback: state_from_url={bool(state)}, state_from_cookie={bool(pipedrive_oauth_state)}")

    # Parse state to get org_id (supports both base64 and raw JSON for backwards compat)
    org_id = 0
    if effective_state:
        # Try base64 decode first (new format)
        parsed = _decode_state(effective_state)
        if parsed:
            org_id = int(parsed.get("org_id", 0))
        else:
            # Fall back to raw JSON (old format)
            try:
                parsed = json.loads(effective_state)
                org_id = int(parsed.get("org_id", 0))
            except Exception:
                pass

    if not org_id:
        logger.error(f"Pipedrive OAuth invalid state: state={state!r}, cookie={pipedrive_oauth_state!r}")
        return RedirectResponse(
            _error_redirect("invalid_state", "Could not determine organization"),
            status_code=307
        )

    org = db.get(models.Organization, org_id)
    if not org:
        return RedirectResponse(
            _error_redirect("unknown_org", "Organization not found"),
            status_code=307
        )

    # Exchange code for tokens
    # Pipedrive uses Basic auth for token exchange
    credentials = base64.b64encode(
        f"{settings.pipedrive_client_id}:{settings.pipedrive_client_secret}".encode()
    ).decode()

    token_data = {
        "grant_type": "authorization_code",
        "redirect_uri": settings.pipedrive_redirect_uri,
        "code": code,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            PIPEDRIVE_TOKEN_URL,
            data=token_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {credentials}",
            },
        )

        if resp.status_code >= 400:
            try:
                err_body = resp.json()
                err_msg = err_body.get("error_description", err_body.get("error", resp.text[:100]))
            except Exception:
                err_msg = resp.text[:100]
            return RedirectResponse(
                _error_redirect("token_exchange_failed", err_msg),
                status_code=307
            )

        token_json = resp.json()

    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    expires_in = token_json.get("expires_in")  # seconds until expiry
    api_domain = token_json.get("api_domain")  # e.g., https://api.pipedrive.com

    if not access_token:
        return RedirectResponse(
            _error_redirect("no_access_token", "Pipedrive did not return access token"),
            status_code=307
        )

    # Store metadata in scopes field
    scopes_meta = {
        "expires_in": expires_in,
        "api_domain": api_domain,
    }

    # Deactivate other Pipedrive creds for this org
    db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org.id,
        models.IntegrationCredential.provider == "pipedrive",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    # Upsert credential
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org.id,
            models.IntegrationCredential.provider == "pipedrive",
            models.IntegrationCredential.auth_type == "oauth",
        )
        .order_by(models.IntegrationCredential.updated_at.desc())
        .first()
    )

    if cred:
        cred.access_token = access_token
        cred.refresh_token = refresh_token or cred.refresh_token
        cred.scopes = json.dumps(scopes_meta)
        cred.is_active = True
        db.add(cred)
    else:
        cred = models.IntegrationCredential(
            organization_id=org.id,
            provider="pipedrive",
            auth_type="oauth",
            access_token=access_token,
            refresh_token=refresh_token,
            scopes=json.dumps(scopes_meta),
            is_active=True,
        )
        db.add(cred)

    db.commit()

    # Optionally set Pipedrive as active CRM
    try:
        if (org.active_crm or "").lower() != "pipedrive":
            org.active_crm = "pipedrive"
            db.add(org)
            db.commit()
    except Exception:
        db.rollback()

    logger.info(f"Pipedrive OAuth completed: org_id={org.id}")

    # Clear the state cookie and redirect
    response = RedirectResponse(_success_redirect(), status_code=307)
    cookie_kwargs = {"path": "/"}
    if COOKIE_DOMAIN:
        cookie_kwargs["domain"] = COOKIE_DOMAIN
    response.delete_cookie("pipedrive_oauth_state", **cookie_kwargs)
    return response


@router.post("/refresh")
async def pipedrive_refresh_token(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Refresh Pipedrive OAuth token.
    Called when access token expires.
    """
    _require_pipedrive_env()

    org_id = user.organization_id
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == "pipedrive",
            models.IntegrationCredential.auth_type == "oauth",
            models.IntegrationCredential.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not cred or not cred.refresh_token:
        raise HTTPException(status_code=400, detail="No Pipedrive OAuth credential found")

    credentials = base64.b64encode(
        f"{settings.pipedrive_client_id}:{settings.pipedrive_client_secret}".encode()
    ).decode()

    token_data = {
        "grant_type": "refresh_token",
        "refresh_token": cred.refresh_token,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            PIPEDRIVE_TOKEN_URL,
            data=token_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {credentials}",
            },
        )

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Pipedrive token refresh failed: {resp.text[:200]}"
            )

        token_json = resp.json()

    cred.access_token = token_json.get("access_token", cred.access_token)
    if token_json.get("refresh_token"):
        cred.refresh_token = token_json["refresh_token"]

    # Update metadata
    if cred.scopes:
        try:
            meta = json.loads(cred.scopes)
        except Exception:
            meta = {}
    else:
        meta = {}

    if token_json.get("expires_in"):
        meta["expires_in"] = token_json["expires_in"]
    if token_json.get("api_domain"):
        meta["api_domain"] = token_json["api_domain"]
    cred.scopes = json.dumps(meta)

    db.add(cred)
    db.commit()

    return {"status": "ok", "message": "Token refreshed"}


@router.delete("/disconnect")
def pipedrive_disconnect(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Disconnect Pipedrive integration.
    Deactivates OAuth credentials.
    """
    org_id = user.organization_id

    updated = db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org_id,
        models.IntegrationCredential.provider == "pipedrive",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    db.commit()

    return {"status": "ok", "disconnected": updated > 0}
