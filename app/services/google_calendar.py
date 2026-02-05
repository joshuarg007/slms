"""Google Calendar integration service for booking system."""

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Google Calendar API scopes
CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


def get_calendar_service(refresh_token: str):
    """
    Create a Google Calendar API service using stored refresh token.

    Args:
        refresh_token: OAuth refresh token for calendar access

    Returns:
        Google Calendar API service object or None if credentials invalid
    """
    try:
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            scopes=CALENDAR_SCOPES,
        )

        # Refresh to get access token
        credentials.refresh(Request())

        service = build("calendar", "v3", credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to create calendar service: {e}")
        return None


def create_calendar_event(
    refresh_token: str,
    calendar_id: str,
    summary: str,
    description: str,
    start_time: datetime,
    duration_minutes: int,
    timezone: str,
    attendee_email: str,
    attendee_name: str,
    location: Optional[str] = None,
    create_meet_link: bool = False,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a calendar event for a booking.

    Args:
        refresh_token: OAuth refresh token
        calendar_id: Google Calendar ID (usually 'primary')
        summary: Event title
        description: Event description/notes
        start_time: Event start time (UTC)
        duration_minutes: Duration in minutes
        timezone: Timezone for the event
        attendee_email: Guest's email address
        attendee_name: Guest's name
        location: Meeting location (optional)
        create_meet_link: Whether to create a Google Meet link

    Returns:
        Tuple of (event_id, meet_link) or (None, None) on error
    """
    service = get_calendar_service(refresh_token)
    if not service:
        logger.error("Could not create calendar service")
        return None, None

    try:
        end_time = start_time + timedelta(minutes=duration_minutes)

        event = {
            "summary": summary,
            "description": description,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": timezone,
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": timezone,
            },
            "attendees": [
                {"email": attendee_email, "displayName": attendee_name},
            ],
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 60},
                    {"method": "popup", "minutes": 15},
                ],
            },
        }

        if location:
            event["location"] = location

        # Add Google Meet conferencing if requested
        if create_meet_link:
            event["conferenceData"] = {
                "createRequest": {
                    "requestId": f"booking-{start_time.timestamp()}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }

        # Create the event
        created_event = service.events().insert(
            calendarId=calendar_id or "primary",
            body=event,
            conferenceDataVersion=1 if create_meet_link else 0,
            sendUpdates="all",  # Send invite emails to attendees
        ).execute()

        event_id = created_event.get("id")
        meet_link = None

        # Extract Meet link if created
        if create_meet_link and "conferenceData" in created_event:
            entry_points = created_event["conferenceData"].get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meet_link = ep.get("uri")
                    break

        logger.info(f"Created calendar event {event_id} with meet link: {meet_link}")
        return event_id, meet_link

    except HttpError as e:
        logger.error(f"Google Calendar API error: {e}")
        return None, None
    except Exception as e:
        logger.error(f"Failed to create calendar event: {e}")
        return None, None


def delete_calendar_event(
    refresh_token: str,
    calendar_id: str,
    event_id: str,
    send_updates: bool = True,
) -> bool:
    """
    Delete a calendar event (when booking is cancelled).

    Args:
        refresh_token: OAuth refresh token
        calendar_id: Google Calendar ID
        event_id: ID of the event to delete
        send_updates: Whether to notify attendees of cancellation

    Returns:
        True if deleted successfully, False otherwise
    """
    service = get_calendar_service(refresh_token)
    if not service:
        logger.error("Could not create calendar service")
        return False

    try:
        service.events().delete(
            calendarId=calendar_id or "primary",
            eventId=event_id,
            sendUpdates="all" if send_updates else "none",
        ).execute()

        logger.info(f"Deleted calendar event {event_id}")
        return True

    except HttpError as e:
        if e.resp.status == 404:
            # Event already deleted
            logger.warning(f"Calendar event {event_id} not found (already deleted)")
            return True
        logger.error(f"Google Calendar API error deleting event: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to delete calendar event: {e}")
        return False


def get_calendar_list(refresh_token: str) -> list:
    """
    Get list of calendars the user has access to.

    Args:
        refresh_token: OAuth refresh token

    Returns:
        List of calendar dicts with id and summary (name)
    """
    service = get_calendar_service(refresh_token)
    if not service:
        return []

    try:
        calendars = []
        page_token = None

        while True:
            calendar_list = service.calendarList().list(
                pageToken=page_token
            ).execute()

            for cal in calendar_list.get("items", []):
                # Only include calendars user can write to
                if cal.get("accessRole") in ["owner", "writer"]:
                    calendars.append({
                        "id": cal["id"],
                        "name": cal.get("summary", cal["id"]),
                        "primary": cal.get("primary", False),
                    })

            page_token = calendar_list.get("nextPageToken")
            if not page_token:
                break

        return calendars

    except Exception as e:
        logger.error(f"Failed to get calendar list: {e}")
        return []


def verify_calendar_connection(refresh_token: str) -> bool:
    """
    Verify that the calendar connection is still valid.

    Args:
        refresh_token: OAuth refresh token

    Returns:
        True if connection is valid, False otherwise
    """
    service = get_calendar_service(refresh_token)
    if not service:
        return False

    try:
        # Try to get calendar settings as a simple API call
        service.settings().get(setting="timezone").execute()
        return True
    except Exception:
        return False
