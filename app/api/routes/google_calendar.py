"""Google Calendar OAuth routes for booking integration."""

import logging
import secrets
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from google_auth_oauthlib.flow import Flow

from app.db.session import get_db
from app.db.models import User, BookingConfig
from app.api.routes.users import get_current_user
from app.core.config import settings
from app.services.google_calendar import (
    CALENDAR_SCOPES,
    get_calendar_list,
    verify_calendar_connection,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/booking/calendar", tags=["Booking Calendar"])

# OAuth state storage (in production, use Redis or database)
_oauth_states: dict = {}


class CalendarListResponse(BaseModel):
    calendars: list
    selected_calendar_id: Optional[str]


class CalendarSelectRequest(BaseModel):
    calendar_id: str


class CalendarStatusResponse(BaseModel):
    connected: bool
    calendar_id: Optional[str]
    calendar_name: Optional[str]


# =============================================================================
# OAUTH ENDPOINTS
# =============================================================================


@router.get("/connect")
def initiate_calendar_connect(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initiate Google Calendar OAuth flow.
    Returns URL to redirect user to for authorization.
    """
    # Verify booking config exists
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .first()
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create a booking configuration first.",
        )

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration not configured.",
        )

    # Generate state token
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "user_id": current_user.id,
        "org_id": current_user.organization_id,
        "created_at": datetime.utcnow(),
    }

    # Build authorization URL
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/booking/calendar/callback"

    # Use google-auth-oauthlib Flow for proper OAuth handling
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=CALENDAR_SCOPES,
        redirect_uri=redirect_uri,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # Force consent to get refresh token
        state=state,
    )

    return {"authorization_url": auth_url}


@router.get("/callback")
def calendar_oauth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Handle OAuth callback from Google.
    Stores refresh token and redirects back to app.
    """
    # Determine frontend URL for redirect
    frontend_url = settings.frontend_base_url or str(request.base_url).rstrip("/")
    if frontend_url.endswith("/api"):
        frontend_url = frontend_url[:-4]

    # Handle errors
    if error:
        logger.error(f"Google Calendar OAuth error: {error}")
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_error={error}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_error=missing_params"
        )

    # Validate state
    state_data = _oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_error=invalid_state"
        )

    # Check state age (10 minute expiry)
    age = (datetime.utcnow() - state_data["created_at"]).total_seconds()
    if age > 600:
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_error=expired_state"
        )

    try:
        # Build redirect URI
        base_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}/api/booking/calendar/callback"

        # Exchange code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=CALENDAR_SCOPES,
            redirect_uri=redirect_uri,
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        if not credentials.refresh_token:
            logger.error("No refresh token received from Google")
            return RedirectResponse(
                url=f"{frontend_url}/app/booking?calendar_error=no_refresh_token"
            )

        # Store refresh token in booking config
        config = (
            db.query(BookingConfig)
            .filter(BookingConfig.organization_id == state_data["org_id"])
            .first()
        )

        if not config:
            return RedirectResponse(
                url=f"{frontend_url}/app/booking?calendar_error=config_not_found"
            )

        config.google_refresh_token = credentials.refresh_token
        if not config.google_calendar_id:
            config.google_calendar_id = "primary"
        config.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"Google Calendar connected for org {state_data['org_id']}")
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_connected=true"
        )

    except Exception as e:
        logger.error(f"Failed to complete calendar OAuth: {e}")
        return RedirectResponse(
            url=f"{frontend_url}/app/booking?calendar_error=token_exchange_failed"
        )


# =============================================================================
# CALENDAR MANAGEMENT ENDPOINTS
# =============================================================================


@router.get("/status", response_model=CalendarStatusResponse)
def get_calendar_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current Google Calendar connection status."""
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .first()
    )

    if not config or not config.google_refresh_token:
        return CalendarStatusResponse(
            connected=False,
            calendar_id=None,
            calendar_name=None,
        )

    # Verify connection is still valid
    is_valid = verify_calendar_connection(config.google_refresh_token)

    if not is_valid:
        # Token is invalid, clear it
        config.google_refresh_token = None
        config.updated_at = datetime.utcnow()
        db.commit()
        return CalendarStatusResponse(
            connected=False,
            calendar_id=None,
            calendar_name=None,
        )

    # Get calendar name
    calendar_name = None
    if config.google_calendar_id:
        calendars = get_calendar_list(config.google_refresh_token)
        for cal in calendars:
            if cal["id"] == config.google_calendar_id:
                calendar_name = cal["name"]
                break

    return CalendarStatusResponse(
        connected=True,
        calendar_id=config.google_calendar_id,
        calendar_name=calendar_name or config.google_calendar_id,
    )


@router.get("/list", response_model=CalendarListResponse)
def list_calendars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available calendars for selection."""
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .first()
    )

    if not config or not config.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected.",
        )

    calendars = get_calendar_list(config.google_refresh_token)

    return CalendarListResponse(
        calendars=calendars,
        selected_calendar_id=config.google_calendar_id,
    )


@router.put("/select")
def select_calendar(
    data: CalendarSelectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Select which calendar to use for bookings."""
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .first()
    )

    if not config or not config.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected.",
        )

    # Verify the calendar exists and is accessible
    calendars = get_calendar_list(config.google_refresh_token)
    valid_ids = [c["id"] for c in calendars]

    if data.calendar_id not in valid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid calendar ID.",
        )

    config.google_calendar_id = data.calendar_id
    config.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "calendar_id": data.calendar_id}


@router.delete("/disconnect")
def disconnect_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect Google Calendar integration."""
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .first()
    )

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking configuration not found.",
        )

    config.google_refresh_token = None
    config.google_calendar_id = None
    config.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Google Calendar disconnected for org {current_user.organization_id}")
    return {"success": True}
