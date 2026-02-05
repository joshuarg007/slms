"""Booking/Scheduling API routes - Admin endpoints."""

import secrets
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    User,
    Organization,
    BookingConfig,
    MeetingType,
    AvailabilityRule,
    BlockedDate,
    Booking,
)
from app.api.routes.users import get_current_user
from app.core.plans import (
    get_plan_limits,
    validate_meeting_types_count,
)

router = APIRouter(prefix="/booking", tags=["Booking"])


# =============================================================================
# SCHEMAS
# =============================================================================


class BookingConfigCreate(BaseModel):
    name: str = Field(default="Default Booking Page", min_length=1, max_length=100)  # Internal name
    slug: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-z0-9-]+$")
    business_name: str = Field(..., min_length=1, max_length=255)
    logo_url: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: str = "#6366f1"
    timezone: str = "America/New_York"
    booking_window_days: int = 30
    min_notice_hours: int = 4
    buffer_minutes: int = 15


class BookingConfigUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None  # Allow updating slug
    business_name: Optional[str] = None
    logo_url: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: Optional[str] = None
    timezone: Optional[str] = None
    booking_window_days: Optional[int] = None
    min_notice_hours: Optional[int] = None
    buffer_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class BookingConfigResponse(BaseModel):
    id: int
    booking_key: str
    name: str
    slug: str
    business_name: str
    logo_url: Optional[str]
    welcome_message: Optional[str]
    primary_color: str
    timezone: str
    booking_window_days: int
    min_notice_hours: int
    buffer_minutes: int
    is_active: bool
    google_calendar_connected: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingConfigListItem(BaseModel):
    """Summary item for listing booking configs."""
    id: int
    booking_key: str
    name: str
    slug: str
    business_name: str
    primary_color: str
    is_active: bool
    meeting_types_count: int = 0
    bookings_count: int = 0

    class Config:
        from_attributes = True


class MeetingTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    duration_minutes: int = Field(..., ge=5, le=480)
    color: str = "#6366f1"
    collect_phone: bool = False
    collect_company: bool = True
    custom_questions: List[dict] = []
    location_type: str = "google_meet"
    custom_location: Optional[str] = None


class MeetingTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None
    collect_phone: Optional[bool] = None
    collect_company: Optional[bool] = None
    custom_questions: Optional[List[dict]] = None
    location_type: Optional[str] = None
    custom_location: Optional[str] = None


class MeetingTypeResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    duration_minutes: int
    color: str
    is_active: bool
    order_index: int
    collect_phone: bool
    collect_company: bool
    custom_questions: List[dict]
    location_type: str
    custom_location: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AvailabilityRuleCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    is_available: bool = True


class AvailabilityRuleResponse(BaseModel):
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool

    class Config:
        from_attributes = True


class BlockedDateCreate(BaseModel):
    blocked_date: date
    reason: Optional[str] = None


class BlockedDateResponse(BaseModel):
    id: int
    blocked_date: date
    reason: Optional[str]

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    id: int
    meeting_type_id: int
    meeting_type_name: Optional[str] = None
    lead_id: Optional[int]
    guest_name: str
    guest_email: str
    guest_phone: Optional[str]
    guest_company: Optional[str]
    guest_notes: Optional[str]
    scheduled_at: datetime
    duration_minutes: int
    timezone: str
    status: str
    source: str
    meeting_link: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def generate_booking_key():
    """Generate a unique booking key."""
    return f"bkg_{secrets.token_urlsafe(16)}"


def _config_to_response(config: BookingConfig) -> BookingConfigResponse:
    """Convert a BookingConfig model to response schema."""
    return BookingConfigResponse(
        id=config.id,
        booking_key=config.booking_key,
        name=config.name,
        slug=config.slug,
        business_name=config.business_name,
        logo_url=config.logo_url,
        welcome_message=config.welcome_message,
        primary_color=config.primary_color,
        timezone=config.timezone,
        booking_window_days=config.booking_window_days,
        min_notice_hours=config.min_notice_hours,
        buffer_minutes=config.buffer_minutes,
        is_active=config.is_active,
        google_calendar_connected=bool(config.google_refresh_token),
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


# =============================================================================
# BOOKING CONFIG ENDPOINTS
# =============================================================================


@router.get("/configs", response_model=List[BookingConfigListItem])
def list_booking_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all booking configurations for the organization."""
    configs = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .order_by(BookingConfig.created_at.desc())
        .all()
    )

    result = []
    for config in configs:
        meeting_types_count = db.query(MeetingType).filter(
            MeetingType.booking_config_id == config.id
        ).count()
        bookings_count = db.query(Booking).join(MeetingType).filter(
            MeetingType.booking_config_id == config.id
        ).count()

        result.append(BookingConfigListItem(
            id=config.id,
            booking_key=config.booking_key,
            name=config.name,
            slug=config.slug,
            business_name=config.business_name,
            primary_color=config.primary_color,
            is_active=config.is_active,
            meeting_types_count=meeting_types_count,
            bookings_count=bookings_count,
        ))

    return result


@router.get("/config", response_model=Optional[BookingConfigResponse])
def get_booking_config(
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a booking configuration. If booking_key is provided, get that specific config.
    Otherwise, get the first/default config for backwards compatibility."""
    query = db.query(BookingConfig).filter(
        BookingConfig.organization_id == current_user.organization_id
    )

    if booking_key:
        config = query.filter(BookingConfig.booking_key == booking_key).first()
    else:
        # Backwards compatibility: return first config
        config = query.order_by(BookingConfig.created_at.asc()).first()

    if not config:
        return None

    return _config_to_response(config)


@router.get("/config/{booking_key}", response_model=BookingConfigResponse)
def get_booking_config_by_key(
    booking_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific booking configuration by its key."""
    config = (
        db.query(BookingConfig)
        .filter(
            BookingConfig.organization_id == current_user.organization_id,
            BookingConfig.booking_key == booking_key,
        )
        .first()
    )

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking configuration not found",
        )

    return _config_to_response(config)


@router.post("/config", response_model=BookingConfigResponse, status_code=status.HTTP_201_CREATED)
def create_booking_config(
    data: BookingConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new booking configuration for the organization."""
    # Check plan limits for number of booking pages
    existing_count = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .count()
    )

    # Get plan limits (reuse chat widget logic - typically 1 for free, 3 for starter, unlimited for pro)
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    plan = org.plan if org else "free"
    limits = get_plan_limits(plan)

    # Use same limits as chat widgets for booking pages
    max_booking_pages = limits.get("chat_widgets", 1)
    if existing_count >= max_booking_pages:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your plan allows up to {max_booking_pages} booking page(s). Please upgrade to add more.",
        )

    # Check if slug is taken globally
    slug_exists = db.query(BookingConfig).filter(BookingConfig.slug == data.slug).first()
    if slug_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking URL is already taken. Please choose another.",
        )

    config = BookingConfig(
        organization_id=current_user.organization_id,
        booking_key=generate_booking_key(),
        name=data.name,
        slug=data.slug,
        business_name=data.business_name,
        logo_url=data.logo_url,
        welcome_message=data.welcome_message,
        primary_color=data.primary_color,
        timezone=data.timezone,
        booking_window_days=data.booking_window_days,
        min_notice_hours=data.min_notice_hours,
        buffer_minutes=data.buffer_minutes,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    # Create default availability rules (Mon-Fri 9-5)
    for day in range(1, 6):  # Monday to Friday
        rule = AvailabilityRule(
            booking_config_id=config.id,
            day_of_week=day,
            start_time="09:00",
            end_time="17:00",
            is_available=True,
        )
        db.add(rule)
    db.commit()

    return _config_to_response(config)


@router.put("/config", response_model=BookingConfigResponse)
def update_booking_config_default(
    data: BookingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the default/first booking configuration (backwards compatibility)."""
    config = (
        db.query(BookingConfig)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .order_by(BookingConfig.created_at.asc())
        .first()
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking configuration not found. Create one first.",
        )

    return _update_config(config, data, db, current_user)


@router.put("/config/{booking_key}", response_model=BookingConfigResponse)
def update_booking_config_by_key(
    booking_key: str,
    data: BookingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a specific booking configuration by its key."""
    config = (
        db.query(BookingConfig)
        .filter(
            BookingConfig.organization_id == current_user.organization_id,
            BookingConfig.booking_key == booking_key,
        )
        .first()
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking configuration not found.",
        )

    return _update_config(config, data, db, current_user)


def _update_config(config: BookingConfig, data: BookingConfigUpdate, db: Session, current_user: User) -> BookingConfigResponse:
    """Internal helper to update a booking config."""
    # Check plan limits for custom colors
    if data.primary_color:
        org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        limits = get_plan_limits(org.plan if org else "free")
        if not limits.booking_custom_colors and data.primary_color != "#6366f1":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Custom colors require a paid plan. Please upgrade.",
            )

    # Check if new slug is taken by another config
    if data.slug and data.slug != config.slug:
        slug_exists = db.query(BookingConfig).filter(
            BookingConfig.slug == data.slug,
            BookingConfig.id != config.id
        ).first()
        if slug_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking URL is already taken. Please choose another.",
            )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(config)

    return _config_to_response(config)


@router.delete("/config/{booking_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking_config(
    booking_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a booking configuration."""
    config = (
        db.query(BookingConfig)
        .filter(
            BookingConfig.organization_id == current_user.organization_id,
            BookingConfig.booking_key == booking_key,
        )
        .first()
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking configuration not found.",
        )

    db.delete(config)
    db.commit()
    return None


# =============================================================================
# HELPER: Get config by booking_key or default
# =============================================================================


def _get_booking_config(
    db: Session,
    organization_id: int,
    booking_key: Optional[str] = None,
) -> Optional[BookingConfig]:
    """Get a booking config by key or return the first/default config."""
    query = db.query(BookingConfig).filter(
        BookingConfig.organization_id == organization_id
    )
    if booking_key:
        return query.filter(BookingConfig.booking_key == booking_key).first()
    return query.order_by(BookingConfig.created_at.asc()).first()


# =============================================================================
# MEETING TYPE ENDPOINTS
# =============================================================================


@router.get("/meeting-types", response_model=List[MeetingTypeResponse])
def list_meeting_types(
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all meeting types for a booking config. If booking_key not provided, uses default config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        return []

    types = (
        db.query(MeetingType)
        .filter(MeetingType.booking_config_id == config.id)
        .order_by(MeetingType.order_index)
        .all()
    )
    return types


@router.post("/meeting-types", response_model=MeetingTypeResponse, status_code=status.HTTP_201_CREATED)
def create_meeting_type(
    data: MeetingTypeCreate,
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new meeting type for a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create a booking configuration first.",
        )

    # Check plan limits
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    current_count = db.query(MeetingType).filter(MeetingType.booking_config_id == config.id).count()
    is_valid, error_msg = validate_meeting_types_count(org.plan if org else "free", current_count)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)

    # Check slug uniqueness within this config
    existing = (
        db.query(MeetingType)
        .filter(
            MeetingType.booking_config_id == config.id,
            MeetingType.slug == data.slug,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A meeting type with this URL already exists.",
        )

    meeting_type = MeetingType(
        booking_config_id=config.id,
        name=data.name,
        slug=data.slug,
        description=data.description,
        duration_minutes=data.duration_minutes,
        color=data.color,
        collect_phone=data.collect_phone,
        collect_company=data.collect_company,
        custom_questions=data.custom_questions or [],
        location_type=data.location_type,
        custom_location=data.custom_location,
        order_index=current_count,
        created_at=datetime.utcnow(),
    )
    db.add(meeting_type)
    db.commit()
    db.refresh(meeting_type)

    return meeting_type


@router.put("/meeting-types/{meeting_type_id}", response_model=MeetingTypeResponse)
def update_meeting_type(
    meeting_type_id: int,
    data: MeetingTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meeting type."""
    # Get all config IDs for this org
    config_ids = [
        c.id for c in db.query(BookingConfig.id)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .all()
    ]
    if not config_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    meeting_type = (
        db.query(MeetingType)
        .filter(
            MeetingType.id == meeting_type_id,
            MeetingType.booking_config_id.in_(config_ids),
        )
        .first()
    )
    if not meeting_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting type not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting_type, key, value)

    db.commit()
    db.refresh(meeting_type)

    return meeting_type


@router.delete("/meeting-types/{meeting_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting_type(
    meeting_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meeting type."""
    # Get all config IDs for this org
    config_ids = [
        c.id for c in db.query(BookingConfig.id)
        .filter(BookingConfig.organization_id == current_user.organization_id)
        .all()
    ]
    if not config_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    meeting_type = (
        db.query(MeetingType)
        .filter(
            MeetingType.id == meeting_type_id,
            MeetingType.booking_config_id.in_(config_ids),
        )
        .first()
    )
    if not meeting_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting type not found")

    db.delete(meeting_type)
    db.commit()


# =============================================================================
# AVAILABILITY ENDPOINTS
# =============================================================================


@router.get("/availability", response_model=List[AvailabilityRuleResponse])
def get_availability(
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get availability rules for a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        return []

    rules = (
        db.query(AvailabilityRule)
        .filter(AvailabilityRule.booking_config_id == config.id)
        .order_by(AvailabilityRule.day_of_week)
        .all()
    )
    return rules


@router.put("/availability", response_model=List[AvailabilityRuleResponse])
def update_availability(
    rules: List[AvailabilityRuleCreate],
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace all availability rules for a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    # Delete existing rules
    db.query(AvailabilityRule).filter(AvailabilityRule.booking_config_id == config.id).delete()

    # Create new rules
    new_rules = []
    for rule_data in rules:
        rule = AvailabilityRule(
            booking_config_id=config.id,
            day_of_week=rule_data.day_of_week,
            start_time=rule_data.start_time,
            end_time=rule_data.end_time,
            is_available=rule_data.is_available,
        )
        db.add(rule)
        new_rules.append(rule)

    db.commit()
    for rule in new_rules:
        db.refresh(rule)

    return new_rules


# =============================================================================
# BLOCKED DATES ENDPOINTS
# =============================================================================


@router.get("/blocked-dates", response_model=List[BlockedDateResponse])
def get_blocked_dates(
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get blocked dates for a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        return []

    blocked = (
        db.query(BlockedDate)
        .filter(BlockedDate.booking_config_id == config.id)
        .order_by(BlockedDate.blocked_date)
        .all()
    )
    return blocked


@router.post("/blocked-dates", response_model=BlockedDateResponse, status_code=status.HTTP_201_CREATED)
def add_blocked_date(
    data: BlockedDateCreate,
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a blocked date to a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    blocked = BlockedDate(
        booking_config_id=config.id,
        blocked_date=data.blocked_date,
        reason=data.reason,
    )
    db.add(blocked)
    db.commit()
    db.refresh(blocked)

    return blocked


@router.delete("/blocked-dates/{blocked_date_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_blocked_date(
    blocked_date_id: int,
    booking_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a blocked date from a booking config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    blocked = (
        db.query(BlockedDate)
        .filter(
            BlockedDate.id == blocked_date_id,
            BlockedDate.booking_config_id == config.id,
        )
        .first()
    )
    if not blocked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked date not found")

    db.delete(blocked)
    db.commit()


# =============================================================================
# BOOKINGS ENDPOINTS (VIEW/MANAGE)
# =============================================================================


@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    booking_key: Optional[str] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all bookings for a booking config. If booking_key not provided, uses default config."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        return []

    # Get meeting type IDs for this config
    meeting_type_ids = [mt.id for mt in config.meeting_types]
    if not meeting_type_ids:
        return []

    query = db.query(Booking).filter(Booking.meeting_type_id.in_(meeting_type_ids))

    if status_filter:
        query = query.filter(Booking.status == status_filter)
    if from_date:
        query = query.filter(Booking.scheduled_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.filter(Booking.scheduled_at <= datetime.combine(to_date, datetime.max.time()))

    bookings = query.order_by(Booking.scheduled_at.desc()).all()

    # Add meeting type name
    result = []
    meeting_type_names = {mt.id: mt.name for mt in config.meeting_types}
    for booking in bookings:
        result.append(
            BookingResponse(
                id=booking.id,
                meeting_type_id=booking.meeting_type_id,
                meeting_type_name=meeting_type_names.get(booking.meeting_type_id),
                lead_id=booking.lead_id,
                guest_name=booking.guest_name,
                guest_email=booking.guest_email,
                guest_phone=booking.guest_phone,
                guest_company=booking.guest_company,
                guest_notes=booking.guest_notes,
                scheduled_at=booking.scheduled_at,
                duration_minutes=booking.duration_minutes,
                timezone=booking.timezone,
                status=booking.status,
                source=booking.source,
                meeting_link=booking.meeting_link,
                created_at=booking.created_at,
            )
        )

    return result


@router.put("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    booking_key: Optional[str] = None,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a booking (admin action)."""
    config = _get_booking_config(db, current_user.organization_id, booking_key)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking config not found")

    meeting_type_ids = [mt.id for mt in config.meeting_types]
    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id,
            Booking.meeting_type_id.in_(meeting_type_ids),
        )
        .first()
    )
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    booking.cancellation_reason = reason
    booking.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(booking)

    # Get meeting type name
    meeting_type = db.query(MeetingType).filter(MeetingType.id == booking.meeting_type_id).first()

    return BookingResponse(
        id=booking.id,
        meeting_type_id=booking.meeting_type_id,
        meeting_type_name=meeting_type.name if meeting_type else None,
        lead_id=booking.lead_id,
        guest_name=booking.guest_name,
        guest_email=booking.guest_email,
        guest_phone=booking.guest_phone,
        guest_company=booking.guest_company,
        guest_notes=booking.guest_notes,
        scheduled_at=booking.scheduled_at,
        duration_minutes=booking.duration_minutes,
        timezone=booking.timezone,
        status=booking.status,
        source=booking.source,
        meeting_link=booking.meeting_link,
        created_at=booking.created_at,
    )
