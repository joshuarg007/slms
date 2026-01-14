# app/api/routes/zoho_oauth.py
"""
Zoho CRM OAuth 2.0 integration for Site2CRM.

Flow:
1. User clicks "Connect Zoho" -> /auth redirects to Zoho
2. User authorizes -> Zoho redirects to /callback with code
3. We exchange code for tokens and store in IntegrationCredential

Note: Zoho has multiple datacenters (US, EU, IN, AU, etc.)
Default is US (.com), configurable via ZOHO_ACCOUNTS_URL
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

router = APIRouter(prefix="/integrations/zoho", tags=["Integrations: Zoho"])

# Zoho OAuth URLs (default US datacenter)
def _zoho_auth_url() -> str:
    base = (settings.zoho_accounts_url or "https://accounts.zoho.com").rstrip("/")
    return f"{base}/oauth/v2/auth"

def _zoho_token_url() -> str:
    base = (settings.zoho_accounts_url or "https://accounts.zoho.com").rstrip("/")
    return f"{base}/oauth/v2/token"

# Required scopes for CRM access
ZOHO_SCOPES = [
    "ZohoCRM.modules.leads.ALL",
    "ZohoCRM.modules.contacts.ALL",
    "ZohoCRM.modules.deals.READ",
    "ZohoCRM.modules.accounts.ALL",
    "ZohoCRM.users.READ",
    "ZohoCRM.org.READ",
]


def _require_zoho_env() -> None:
    """Ensure Zoho OAuth is configured."""
    if not settings.zoho_client_id or not settings.zoho_client_secret:
        raise HTTPException(
            status_code=400,
            detail="Zoho OAuth not configured. Set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET."
        )
    if not settings.zoho_redirect_uri:
        raise HTTPException(
            status_code=400,
            detail="Zoho redirect URI not configured. Set ZOHO_REDIRECT_URI."
        )


def _success_redirect() -> str:
    """Redirect URL on successful OAuth."""
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/app/integrations?zoho=connected"


def _error_redirect(code: str, message: str = "") -> str:
    """Redirect URL on OAuth error."""
    base = settings.frontend_base_url.rstrip("/")
    params = {"zoho_error": code}
    if message:
        params["message"] = message[:100]
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
def zoho_auth_start(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Start Zoho OAuth flow.
    Redirects user to Zoho authorization page.
    """
    _require_zoho_env()

    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Generate a random nonce and store org_id in state
    nonce = secrets.token_urlsafe(16)
    state_data = {"org_id": org.id, "user_id": user.id, "nonce": nonce}
    state = _encode_state(state_data)

    logger.info(f"Zoho OAuth started: org_id={org.id}, user_id={user.id}")

    params = {
        "client_id": settings.zoho_client_id,
        "redirect_uri": settings.zoho_redirect_uri,
        "scope": ",".join(ZOHO_SCOPES),
        "response_type": "code",
        "access_type": "offline",  # Required to get refresh_token
        "state": state,
        "prompt": "consent",  # Force consent to always get refresh_token
    }
    url = f"{_zoho_auth_url()}?{urlencode(params)}"

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
    response.set_cookie(key="zoho_oauth_state", value=state, **cookie_kwargs)

    return response


@router.get("/callback")
async def zoho_auth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    location: Optional[str] = Query(None),  # Zoho returns user's datacenter location
    zoho_oauth_state: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Handle Zoho OAuth callback.
    Exchange authorization code for access/refresh tokens.
    """
    _require_zoho_env()

    if error:
        logger.warning(f"Zoho OAuth error: {error}")
        return RedirectResponse(
            _error_redirect(error, "Authorization denied"),
            status_code=307
        )

    if not code:
        logger.warning("Zoho OAuth callback missing code")
        return RedirectResponse(
            _error_redirect("missing_code", "No authorization code received"),
            status_code=307
        )

    # Try URL state first, fall back to cookie
    effective_state = state or zoho_oauth_state
    logger.info(f"Zoho OAuth callback: state_from_url={bool(state)}, state_from_cookie={bool(zoho_oauth_state)}")

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
        logger.error(f"Zoho OAuth invalid state: state={state!r}, cookie={zoho_oauth_state!r}")
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
    token_data = {
        "grant_type": "authorization_code",
        "client_id": settings.zoho_client_id,
        "client_secret": settings.zoho_client_secret,
        "redirect_uri": settings.zoho_redirect_uri,
        "code": code,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _zoho_token_url(),
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if resp.status_code >= 400:
            try:
                err_body = resp.json()
                err_msg = err_body.get("error", resp.text[:100])
            except Exception:
                err_msg = resp.text[:100]
            return RedirectResponse(
                _error_redirect("token_exchange_failed", err_msg),
                status_code=307
            )

        token_json = resp.json()

    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    expires_in = token_json.get("expires_in")  # Usually 3600 (1 hour)
    api_domain = token_json.get("api_domain")  # e.g., https://www.zohoapis.com

    if not access_token:
        return RedirectResponse(
            _error_redirect("no_access_token", "Zoho did not return access token"),
            status_code=307
        )

    # Store metadata
    scopes_meta = {
        "scopes": ",".join(ZOHO_SCOPES),
        "expires_in": expires_in,
        "api_domain": api_domain or "https://www.zohoapis.com",
        "accounts_url": settings.zoho_accounts_url,
        "location": location,  # User's datacenter
    }

    # Deactivate other Zoho creds for this org
    db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org.id,
        models.IntegrationCredential.provider == "zoho",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    # Upsert credential
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org.id,
            models.IntegrationCredential.provider == "zoho",
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
            provider="zoho",
            auth_type="oauth",
            access_token=access_token,
            refresh_token=refresh_token,
            scopes=json.dumps(scopes_meta),
            is_active=True,
        )
        db.add(cred)

    db.commit()

    # Set Zoho as active CRM
    try:
        if (org.active_crm or "").lower() != "zoho":
            org.active_crm = "zoho"
            db.add(org)
            db.commit()
    except Exception:
        db.rollback()

    logger.info(f"Zoho OAuth completed: org_id={org.id}")

    # Clear the state cookie and redirect
    response = RedirectResponse(_success_redirect(), status_code=307)
    cookie_kwargs = {"path": "/"}
    if COOKIE_DOMAIN:
        cookie_kwargs["domain"] = COOKIE_DOMAIN
    response.delete_cookie("zoho_oauth_state", **cookie_kwargs)
    return response


@router.post("/refresh")
async def zoho_refresh_token(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Refresh Zoho OAuth token.
    Zoho tokens expire in 1 hour, so this is critical.
    """
    _require_zoho_env()

    org_id = user.organization_id
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == "zoho",
            models.IntegrationCredential.auth_type == "oauth",
            models.IntegrationCredential.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not cred or not cred.refresh_token:
        raise HTTPException(status_code=400, detail="No Zoho OAuth credential found")

    token_data = {
        "grant_type": "refresh_token",
        "client_id": settings.zoho_client_id,
        "client_secret": settings.zoho_client_secret,
        "refresh_token": cred.refresh_token,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _zoho_token_url(),
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Zoho token refresh failed: {resp.text[:200]}"
            )

        token_json = resp.json()

    cred.access_token = token_json.get("access_token", cred.access_token)
    # Zoho doesn't return new refresh_token on refresh, keep existing

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
def zoho_disconnect(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Disconnect Zoho integration.
    Deactivates OAuth credentials.
    """
    org_id = user.organization_id

    updated = db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org_id,
        models.IntegrationCredential.provider == "zoho",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    db.commit()

    return {"status": "ok", "disconnected": updated > 0}
