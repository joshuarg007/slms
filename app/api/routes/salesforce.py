# app/api/routes/salesforce.py
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import secrets
from typing import Optional, Dict, Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.core.security import COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN
from app.db import models

logger = logging.getLogger(__name__)


def _generate_pkce() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge for OAuth 2.0."""
    # code_verifier: 43-128 character random string
    code_verifier = secrets.token_urlsafe(64)  # 86 characters
    # code_challenge: base64url(sha256(code_verifier))
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge

# Try to use your shared settings object (like billing.py). Fallback to envs if missing.
try:
    from app.core.config import settings  # type: ignore
except Exception:  # pragma: no cover
    class _S:
        salesforce_client_id: str = os.getenv("SALESFORCE_CLIENT_ID", "")
        salesforce_client_secret: str = os.getenv("SALESFORCE_CLIENT_SECRET", "")
        salesforce_redirect_uri: str = os.getenv(
            "SALESFORCE_REDIRECT_URI", "http://localhost:8000/integrations/salesforce/callback"
        )
        # login host; change to test.salesforce.com if you want sandbox
        salesforce_login_base: str = os.getenv("SALESFORCE_LOGIN_BASE", "https://login.salesforce.com")
        frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:5173")
    settings = _S()  # type: ignore


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

router = APIRouter(prefix="/integrations/salesforce", tags=["Integrations: Salesforce"])

AUTH_URL = f"{getattr(settings, 'salesforce_login_base', 'https://login.salesforce.com')}/services/oauth2/authorize"
TOKEN_URL = f"{getattr(settings, 'salesforce_login_base', 'https://login.salesforce.com')}/services/oauth2/token"


def _require_sf_env() -> None:
    if not getattr(settings, "salesforce_client_id", "") or not getattr(settings, "salesforce_client_secret", ""):
        raise HTTPException(status_code=400, detail="Salesforce env vars not configured")
    if not getattr(settings, "salesforce_redirect_uri", ""):
        raise HTTPException(status_code=400, detail="Salesforce redirect URI not configured")


def _success_redirect() -> str:
    # we use Integrations page to reflect connection state
    base = getattr(settings, "frontend_base_url", "http://127.0.0.1:5173").rstrip("/")
    return f"{base}/app/integrations?salesforce=connected"


def _error_redirect(code: str) -> str:
    base = getattr(settings, "frontend_base_url", "http://127.0.0.1:5173").rstrip("/")
    return f"{base}/app/integrations?salesforce_error={code}"


@router.get("/auth")
def sf_auth_start(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Kick off OAuth with PKCE. We store org_id and code_verifier in state.
    """
    _require_sf_env()

    # Make sure the user has an org
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Generate PKCE code_verifier and code_challenge
    code_verifier, code_challenge = _generate_pkce()

    # Generate a random nonce and store org_id + code_verifier in state
    nonce = secrets.token_urlsafe(16)
    state_data = {
        "org_id": org.id,
        "user_id": user.id,
        "nonce": nonce,
        "code_verifier": code_verifier,
    }
    state = _encode_state(state_data)

    logger.info(f"Salesforce OAuth started: org_id={org.id}, user_id={user.id}")

    params = {
        "response_type": "code",
        "client_id": settings.salesforce_client_id,
        "redirect_uri": settings.salesforce_redirect_uri,
        # Minimal scopes needed for APIs + refresh
        "scope": "api refresh_token openid",
        "state": state,
        # PKCE parameters (required by Salesforce Connected App)
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = f"{AUTH_URL}?{urlencode(params)}"

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
    response.set_cookie(key="salesforce_oauth_state", value=state, **cookie_kwargs)

    return response


@router.get("/callback")
async def sf_auth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    salesforce_oauth_state: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Handle Salesforce OAuth redirect, exchange code for tokens, persist IntegrationCredential,
    and stash instance_url in scopes JSON for SOQL usage.
    """
    _require_sf_env()

    # Early error from SF
    if error:
        logger.warning(f"Salesforce OAuth error: {error} - {error_description}")
        # missing code_challenge etc. would come here if PKCE required
        return RedirectResponse(_error_redirect(error), status_code=307)

    if not code:
        logger.warning("Salesforce OAuth callback missing code")
        return RedirectResponse(_error_redirect("missing_code"), status_code=307)

    # Try URL state first, fall back to cookie
    effective_state = state or salesforce_oauth_state
    logger.info(f"Salesforce OAuth callback: state_from_url={bool(state)}, state_from_cookie={bool(salesforce_oauth_state)}")

    # Parse state to get org_id and code_verifier (supports both base64 and raw JSON for backwards compat)
    org_id = 0
    code_verifier = None
    parsed = {}
    if effective_state:
        # Try base64 decode first (new format)
        parsed = _decode_state(effective_state)
        if parsed:
            org_id = int(parsed.get("org_id", 0))
            code_verifier = parsed.get("code_verifier")
        else:
            # Fall back to raw JSON (old format)
            try:
                parsed = json.loads(effective_state)
                org_id = int(parsed.get("org_id", 0))
                code_verifier = parsed.get("code_verifier")
            except Exception:
                pass

    # Resolve org based on current user when state is missing/invalid (Salesforce has this fallback)
    org = db.get(models.Organization, org_id or user.organization_id)
    if not org:
        logger.error(f"Salesforce OAuth unknown org: state={state!r}, org_id={org_id}, user.org_id={user.organization_id}")
        return RedirectResponse(_error_redirect("unknown_org"), status_code=307)

    # Exchange authorization code for tokens (with PKCE code_verifier)
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.salesforce_client_id,
        "client_secret": settings.salesforce_client_secret,
        "redirect_uri": settings.salesforce_redirect_uri,
    }
    # Add code_verifier for PKCE (required by Salesforce)
    if code_verifier:
        data["code_verifier"] = code_verifier

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(TOKEN_URL, data=data)
        if resp.status_code >= 400:
            # Bubble up useful details
            try:
                body = resp.json()
            except Exception:
                body = {"text": resp.text}
            raise HTTPException(
                status_code=502,
                detail=f"Salesforce token exchange failed ({resp.status_code}): {body}",
            )
        token_json = resp.json()

        access_token = token_json.get("access_token")
        refresh_token = token_json.get("refresh_token")
        instance_url = token_json.get("instance_url")  # may be missing on some org/app setups
        id_url = token_json.get("id")                  # identity endpoint
        scope_str = token_json.get("scope")            # space-separated scopes

        if not access_token:
            raise HTTPException(status_code=400, detail="Missing access_token from Salesforce")

        # If instance_url is missing, try to derive it from the Identity endpoint.
        if not instance_url and id_url:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    ident = await client.get(id_url, headers={"Authorization": f"Bearer {access_token}"})
                if ident.status_code < 400:
                    j = ident.json() if ident.headers.get("content-type","").startswith("application/json") else {}
                    # Salesforce identity payload usually includes a "urls" map with a "rest" base:
                    # e.g. "rest": "https://yourdomain.my.salesforce.com/services/data/"
                    rest_base = (j.get("urls", {}) or {}).get("rest")
                    if rest_base and isinstance(rest_base, str) and rest_base.startswith("http"):
                        # strip trailing "/services/data/..."
                        # take everything before '/services/'
                        idx = rest_base.lower().find("/services/")
                        instance_url = rest_base[:idx] if idx != -1 else rest_base
            except Exception:
                # fall through; we'll handle missing instance_url below
                pass

        if not instance_url:
            # We still couldn't determine it; ask user to reconnect or set env.
            # (But this path should be rare after the identity fallback above.)
            raise HTTPException(
                status_code=400,
                detail="Salesforce instance_url not found; please reconnect Salesforce (or set SALESFORCE_INSTANCE_URL).",
            )

        # Stash simple metadata in scopes JSON for later use
        scopes_meta = {
            "instance_url": instance_url.rstrip("/"),
        }
        if id_url:
            scopes_meta["id"] = id_url
        if scope_str:
            scopes_meta["scopes"] = scope_str

    # Stash simple metadata in scopes JSON for later use
    scopes_meta = {
        "instance_url": (instance_url or "").rstrip("/") if instance_url else "",
    }
    if id_url:
        scopes_meta["id"] = id_url
    if scope_str:
        scopes_meta["scopes"] = scope_str

    # Deactivate other Salesforce creds for this org & upsert the current one as active
    db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org.id,
        models.IntegrationCredential.provider == "salesforce",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org.id,
            models.IntegrationCredential.provider == "salesforce",
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
        db.commit()
        db.refresh(cred)
    else:
        cred = models.IntegrationCredential(
            organization_id=org.id,
            provider="salesforce",
            auth_type="oauth",
            access_token=access_token,
            refresh_token=refresh_token,
            scopes=json.dumps(scopes_meta),
            is_active=True,
        )
        db.add(cred)
        db.commit()
        db.refresh(cred)

    # Optionally switch org's active CRM to Salesforce automatically (skip if you prefer manual)
    try:
        if (org.active_crm or "").lower() != "salesforce":
            org.active_crm = "salesforce"
            db.add(org)
            db.commit()
    except Exception:
        db.rollback()

    logger.info(f"Salesforce OAuth completed: org_id={org.id}")

    # Clear the state cookie and redirect
    response = RedirectResponse(_success_redirect(), status_code=307)
    cookie_kwargs = {"path": "/"}
    if COOKIE_DOMAIN:
        cookie_kwargs["domain"] = COOKIE_DOMAIN
    response.delete_cookie("salesforce_oauth_state", **cookie_kwargs)
    return response
