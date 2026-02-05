"""Public Booking API routes - No authentication required."""

import logging
import os
import secrets
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    Organization,
    Lead,
    User,
    BookingConfig,
    MeetingType,
    AvailabilityRule,
    BlockedDate,
    Booking,
)
from app.core.plans import get_plan_limits, validate_bookings_count
from app.services.email import (
    send_booking_confirmation_guest,
    send_booking_notification_host,
    send_booking_cancellation_guest,
    send_booking_cancellation_host,
)
from app.services.google_calendar import (
    create_calendar_event,
    delete_calendar_event,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/book", tags=["Public Booking"])


# =============================================================================
# SCHEMAS
# =============================================================================


class PublicBookingConfigResponse(BaseModel):
    slug: str
    business_name: str
    logo_url: Optional[str]
    welcome_message: Optional[str]
    primary_color: str
    timezone: str
    booking_window_days: int
    min_notice_hours: int


class PublicMeetingTypeResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    duration_minutes: int
    color: str
    collect_phone: bool
    collect_company: bool
    custom_questions: List[dict]
    location_type: str


class TimeSlot(BaseModel):
    start: datetime
    end: datetime


class AvailableSlotsResponse(BaseModel):
    date: date
    slots: List[TimeSlot]


class CreateBookingRequest(BaseModel):
    guest_name: str = Field(..., min_length=1, max_length=255)
    guest_email: EmailStr
    guest_phone: Optional[str] = None
    guest_company: Optional[str] = None
    guest_notes: Optional[str] = None
    custom_answers: dict = {}
    scheduled_at: datetime
    timezone: str


class BookingConfirmationResponse(BaseModel):
    id: int
    meeting_type_name: str
    guest_name: str
    guest_email: str
    scheduled_at: datetime
    duration_minutes: int
    timezone: str
    meeting_link: Optional[str]
    cancel_url: str


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================


@router.get("/{slug}", response_model=PublicBookingConfigResponse)
def get_booking_page(slug: str, db: Session = Depends(get_db)):
    """Get booking page configuration."""
    config = db.query(BookingConfig).filter(
        BookingConfig.slug == slug,
        BookingConfig.is_active == True,
    ).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking page not found",
        )

    return PublicBookingConfigResponse(
        slug=config.slug,
        business_name=config.business_name,
        logo_url=config.logo_url,
        welcome_message=config.welcome_message,
        primary_color=config.primary_color,
        timezone=config.timezone,
        booking_window_days=config.booking_window_days,
        min_notice_hours=config.min_notice_hours,
    )


@router.get("/{slug}/meeting-types", response_model=List[PublicMeetingTypeResponse])
def get_meeting_types(slug: str, db: Session = Depends(get_db)):
    """Get available meeting types for a booking page."""
    config = db.query(BookingConfig).filter(
        BookingConfig.slug == slug,
        BookingConfig.is_active == True,
    ).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking page not found",
        )

    types = (
        db.query(MeetingType)
        .filter(
            MeetingType.booking_config_id == config.id,
            MeetingType.is_active == True,
        )
        .order_by(MeetingType.order_index)
        .all()
    )

    return [
        PublicMeetingTypeResponse(
            id=t.id,
            name=t.name,
            slug=t.slug,
            description=t.description,
            duration_minutes=t.duration_minutes,
            color=t.color,
            collect_phone=t.collect_phone,
            collect_company=t.collect_company,
            custom_questions=t.custom_questions or [],
            location_type=t.location_type,
        )
        for t in types
    ]


@router.get("/{slug}/{meeting_slug}/slots", response_model=List[AvailableSlotsResponse])
def get_available_slots(
    slug: str,
    meeting_slug: str,
    start_date: date,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get available time slots for a meeting type."""
    config = db.query(BookingConfig).filter(
        BookingConfig.slug == slug,
        BookingConfig.is_active == True,
    ).first()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking page not found")

    meeting_type = db.query(MeetingType).filter(
        MeetingType.booking_config_id == config.id,
        MeetingType.slug == meeting_slug,
        MeetingType.is_active == True,
    ).first()

    if not meeting_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting type not found")

    # Default end_date to 7 days after start
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Cap at booking window
    max_date = date.today() + timedelta(days=config.booking_window_days)
    if end_date > max_date:
        end_date = max_date

    # Get availability rules
    rules = db.query(AvailabilityRule).filter(
        AvailabilityRule.booking_config_id == config.id,
        AvailabilityRule.is_available == True,
    ).all()
    rules_by_day = {r.day_of_week: r for r in rules}

    # Get blocked dates
    blocked = db.query(BlockedDate).filter(
        BlockedDate.booking_config_id == config.id,
        BlockedDate.blocked_date >= start_date,
        BlockedDate.blocked_date <= end_date,
    ).all()
    blocked_dates = {b.blocked_date for b in blocked}

    # Get existing bookings in range
    existing_bookings = db.query(Booking).filter(
        Booking.meeting_type_id == meeting_type.id,
        Booking.status.in_(["confirmed"]),
        Booking.scheduled_at >= datetime.combine(start_date, datetime.min.time()),
        Booking.scheduled_at <= datetime.combine(end_date, datetime.max.time()),
    ).all()

    # Build slots
    result = []
    current_date = start_date
    min_notice = datetime.utcnow() + timedelta(hours=config.min_notice_hours)

    while current_date <= end_date:
        # Skip blocked dates
        if current_date in blocked_dates:
            current_date += timedelta(days=1)
            continue

        # Check availability rule for this day
        day_of_week = current_date.weekday()
        # Convert Python weekday (0=Monday) to our format (0=Sunday)
        day_of_week = (day_of_week + 1) % 7

        rule = rules_by_day.get(day_of_week)
        if not rule:
            current_date += timedelta(days=1)
            continue

        # Generate slots for this day
        day_slots = []
        start_time = datetime.strptime(rule.start_time, "%H:%M").time()
        end_time = datetime.strptime(rule.end_time, "%H:%M").time()

        slot_start = datetime.combine(current_date, start_time)
        day_end = datetime.combine(current_date, end_time)

        while slot_start + timedelta(minutes=meeting_type.duration_minutes) <= day_end:
            slot_end = slot_start + timedelta(minutes=meeting_type.duration_minutes)

            # Check if slot is after minimum notice
            if slot_start > min_notice:
                # Check if slot conflicts with existing booking
                is_available = True
                for existing in existing_bookings:
                    existing_end = existing.scheduled_at + timedelta(minutes=existing.duration_minutes + config.buffer_minutes)
                    existing_start = existing.scheduled_at - timedelta(minutes=config.buffer_minutes)
                    if slot_start < existing_end and slot_end > existing_start:
                        is_available = False
                        break

                if is_available:
                    day_slots.append(TimeSlot(start=slot_start, end=slot_end))

            # Move to next slot (30 min increments)
            slot_start += timedelta(minutes=30)

        if day_slots:
            result.append(AvailableSlotsResponse(date=current_date, slots=day_slots))

        current_date += timedelta(days=1)

    return result


@router.post("/{slug}/{meeting_slug}", response_model=BookingConfirmationResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    slug: str,
    meeting_slug: str,
    data: CreateBookingRequest,
    db: Session = Depends(get_db),
):
    """Create a new booking."""
    config = db.query(BookingConfig).filter(
        BookingConfig.slug == slug,
        BookingConfig.is_active == True,
    ).first()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking page not found")

    meeting_type = db.query(MeetingType).filter(
        MeetingType.booking_config_id == config.id,
        MeetingType.slug == meeting_slug,
        MeetingType.is_active == True,
    ).first()

    if not meeting_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting type not found")

    # Check plan limits
    org = db.query(Organization).filter(Organization.id == config.organization_id).first()
    plan = org.plan if org else "free"

    # Count bookings this month
    month_start = date.today().replace(day=1)
    month_bookings = db.query(Booking).join(MeetingType).filter(
        MeetingType.booking_config_id == config.id,
        Booking.created_at >= datetime.combine(month_start, datetime.min.time()),
    ).count()

    is_valid, error_msg = validate_bookings_count(plan, month_bookings)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This booking page has reached its monthly limit. Please contact the host.",
        )

    # Validate slot is available
    min_notice = datetime.utcnow() + timedelta(hours=config.min_notice_hours)
    if data.scheduled_at < min_notice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please book at least {config.min_notice_hours} hours in advance.",
        )

    # Check for conflicts
    slot_end = data.scheduled_at + timedelta(minutes=meeting_type.duration_minutes)
    conflict = db.query(Booking).filter(
        Booking.meeting_type_id == meeting_type.id,
        Booking.status == "confirmed",
        Booking.scheduled_at < slot_end,
        Booking.scheduled_at + timedelta(minutes=meeting_type.duration_minutes) > data.scheduled_at,
    ).first()

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is no longer available. Please choose another time.",
        )

    # Create or find lead
    lead = db.query(Lead).filter(
        Lead.organization_id == config.organization_id,
        Lead.email == data.guest_email,
    ).first()

    if not lead:
        lead = Lead(
            organization_id=config.organization_id,
            name=data.guest_name,
            email=data.guest_email,
            first_name=data.guest_name.split()[0] if data.guest_name else "",
            last_name=" ".join(data.guest_name.split()[1:]) if len(data.guest_name.split()) > 1 else "",
            phone=data.guest_phone,
            company=data.guest_company,
            source="booking_page",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(lead)
        db.flush()

    # Create booking
    cancel_token = secrets.token_urlsafe(32)
    booking = Booking(
        meeting_type_id=meeting_type.id,
        lead_id=lead.id,
        guest_name=data.guest_name,
        guest_email=data.guest_email,
        guest_phone=data.guest_phone,
        guest_company=data.guest_company,
        guest_notes=data.guest_notes,
        custom_answers=data.custom_answers,
        scheduled_at=data.scheduled_at,
        duration_minutes=meeting_type.duration_minutes,
        timezone=data.timezone,
        source="booking_page",
        cancel_token=cancel_token,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Create Google Calendar event if connected
    if config.google_refresh_token:
        try:
            # Build event description
            description_parts = [
                f"Booking with {data.guest_name}",
                f"Email: {data.guest_email}",
            ]
            if data.guest_phone:
                description_parts.append(f"Phone: {data.guest_phone}")
            if data.guest_company:
                description_parts.append(f"Company: {data.guest_company}")
            if data.guest_notes:
                description_parts.append(f"\nNotes: {data.guest_notes}")
            description_parts.append(f"\nBooked via Site2CRM")

            # Determine if we should create a Google Meet link
            create_meet = meeting_type.location_type == "google_meet"

            # Determine location
            location = None
            if meeting_type.location_type == "phone":
                location = f"Phone call - {data.guest_phone}" if data.guest_phone else "Phone call"
            elif meeting_type.location_type == "in_person" and meeting_type.custom_location:
                location = meeting_type.custom_location
            elif meeting_type.location_type == "custom" and meeting_type.custom_location:
                location = meeting_type.custom_location
            elif meeting_type.location_type == "zoom" and meeting_type.custom_location:
                location = meeting_type.custom_location

            event_id, meet_link = create_calendar_event(
                refresh_token=config.google_refresh_token,
                calendar_id=config.google_calendar_id or "primary",
                summary=f"{meeting_type.name} - {data.guest_name}",
                description="\n".join(description_parts),
                start_time=data.scheduled_at,
                duration_minutes=meeting_type.duration_minutes,
                timezone=data.timezone,
                attendee_email=data.guest_email,
                attendee_name=data.guest_name,
                location=location,
                create_meet_link=create_meet,
            )

            if event_id:
                booking.google_event_id = event_id
                if meet_link:
                    booking.meeting_link = meet_link
                db.commit()
                logger.info(f"Created calendar event {event_id} for booking {booking.id}")
            else:
                logger.warning(f"Failed to create calendar event for booking {booking.id}")
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")

    # Send confirmation emails (async-safe, won't block response)
    try:
        manage_url = f"https://site2crm.io/book/{slug}/cancel/{booking.id}?token={cancel_token}"

        # Send confirmation to guest
        send_booking_confirmation_guest(
            recipient=data.guest_email,
            guest_name=data.guest_name,
            meeting_type_name=meeting_type.name,
            host_name=config.business_name,
            scheduled_at=data.scheduled_at,
            duration_minutes=meeting_type.duration_minutes,
            timezone=data.timezone,
            meeting_link=booking.meeting_link,
            manage_url=manage_url,
        )

        # Send notification to host (find org owner/default user)
        host_user = db.query(User).filter(
            User.organization_id == config.organization_id,
            User.is_default == True,
        ).first()
        if not host_user:
            host_user = db.query(User).filter(
                User.organization_id == config.organization_id,
                User.role == "OWNER",
            ).first()

        if host_user:
            send_booking_notification_host(
                recipient=host_user.email,
                host_name=config.business_name,
                guest_name=data.guest_name,
                guest_email=data.guest_email,
                guest_company=data.guest_company,
                meeting_type_name=meeting_type.name,
                scheduled_at=data.scheduled_at,
                duration_minutes=meeting_type.duration_minutes,
                timezone=data.timezone,
                guest_notes=data.guest_notes,
            )
    except Exception as e:
        logger.warning(f"Failed to send booking emails: {e}")

    return BookingConfirmationResponse(
        id=booking.id,
        meeting_type_name=meeting_type.name,
        guest_name=booking.guest_name,
        guest_email=booking.guest_email,
        scheduled_at=booking.scheduled_at,
        duration_minutes=booking.duration_minutes,
        timezone=booking.timezone,
        meeting_link=booking.meeting_link,
        cancel_url=f"/book/{slug}/cancel/{booking.id}?token={cancel_token}",
    )


@router.get("/booking/{booking_id}", response_model=BookingConfirmationResponse)
def get_booking(
    booking_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Get booking details (for confirmation page)."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.cancel_token == token,
    ).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    meeting_type = db.query(MeetingType).filter(MeetingType.id == booking.meeting_type_id).first()
    config = db.query(BookingConfig).filter(BookingConfig.id == meeting_type.booking_config_id).first()

    return BookingConfirmationResponse(
        id=booking.id,
        meeting_type_name=meeting_type.name,
        guest_name=booking.guest_name,
        guest_email=booking.guest_email,
        scheduled_at=booking.scheduled_at,
        duration_minutes=booking.duration_minutes,
        timezone=booking.timezone,
        meeting_link=booking.meeting_link,
        cancel_url=f"/book/{config.slug}/cancel/{booking.id}?token={booking.cancel_token}",
    )


@router.post("/booking/{booking_id}/cancel")
def cancel_booking_public(
    booking_id: int,
    token: str,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Cancel a booking (public - requires token)."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.cancel_token == token,
    ).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled")

    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    booking.cancellation_reason = reason
    booking.updated_at = datetime.utcnow()

    db.commit()

    # Delete Google Calendar event if connected
    if booking.google_event_id:
        try:
            meeting_type = db.query(MeetingType).filter(MeetingType.id == booking.meeting_type_id).first()
            config = db.query(BookingConfig).filter(BookingConfig.id == meeting_type.booking_config_id).first()

            if config and config.google_refresh_token:
                deleted = delete_calendar_event(
                    refresh_token=config.google_refresh_token,
                    calendar_id=config.google_calendar_id or "primary",
                    event_id=booking.google_event_id,
                    send_updates=True,
                )
                if deleted:
                    logger.info(f"Deleted calendar event {booking.google_event_id} for booking {booking.id}")
                else:
                    logger.warning(f"Failed to delete calendar event for booking {booking.id}")
        except Exception as e:
            logger.error(f"Error deleting calendar event: {e}")

    # Send cancellation emails
    try:
        meeting_type = db.query(MeetingType).filter(MeetingType.id == booking.meeting_type_id).first()
        config = db.query(BookingConfig).filter(BookingConfig.id == meeting_type.booking_config_id).first()
        booking_url = f"https://site2crm.io/book/{config.slug}"

        # Send to guest
        send_booking_cancellation_guest(
            recipient=booking.guest_email,
            guest_name=booking.guest_name,
            meeting_type_name=meeting_type.name,
            host_name=config.business_name,
            scheduled_at=booking.scheduled_at,
            timezone=booking.timezone,
            booking_url=booking_url,
        )

        # Send to host
        host_user = db.query(User).filter(
            User.organization_id == config.organization_id,
            User.is_default == True,
        ).first()
        if not host_user:
            host_user = db.query(User).filter(
                User.organization_id == config.organization_id,
                User.role == "OWNER",
            ).first()

        if host_user:
            send_booking_cancellation_host(
                recipient=host_user.email,
                host_name=config.business_name,
                guest_name=booking.guest_name,
                guest_email=booking.guest_email,
                meeting_type_name=meeting_type.name,
                scheduled_at=booking.scheduled_at,
                timezone=booking.timezone,
                cancellation_reason=reason,
            )
    except Exception as e:
        logger.warning(f"Failed to send cancellation emails: {e}")

    return {"message": "Booking cancelled successfully"}


# =============================================================================
# EMBEDDABLE WIDGET
# =============================================================================


@router.get("/booking-widget.js")
def get_booking_widget():
    """Serve the embeddable booking widget JavaScript."""
    widget_path = Path(__file__).parent.parent.parent.parent / "widget" / "booking-widget" / "booking-widget.js"

    if not widget_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")

    with open(widget_path, "r") as f:
        content = f.read()

    return Response(
        content=content,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    )
