"""Lead processing utilities: sanitization, spam detection, and deduplication."""

import re
import html
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.db import models


# --- Data Sanitization ---

def sanitize_string(value: Optional[str], max_length: int = 500) -> str:
    """Clean and normalize a string value."""
    if not value:
        return ""

    # Convert to string if needed
    value = str(value)

    # Decode HTML entities
    value = html.unescape(value)

    # Remove null bytes and control characters (except newlines/tabs)
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)

    # Normalize whitespace
    value = ' '.join(value.split())

    # Trim to max length
    if len(value) > max_length:
        value = value[:max_length].rsplit(' ', 1)[0] + '...'

    return value.strip()


def sanitize_email(email: Optional[str]) -> str:
    """Clean and normalize email address."""
    if not email:
        return ""

    email = str(email).lower().strip()

    # Remove any whitespace
    email = re.sub(r'\s+', '', email)

    # Basic email validation
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return ""

    return email


def sanitize_phone(phone: Optional[str]) -> str:
    """Clean phone number, keeping only digits and common formatting."""
    if not phone:
        return ""

    phone = str(phone).strip()

    # Keep only digits, plus sign, parentheses, dashes, spaces
    phone = re.sub(r'[^\d+\-\(\)\s]', '', phone)

    # Normalize to just digits for storage (keep + for international)
    digits = re.sub(r'[^\d+]', '', phone)

    # Must have reasonable length (at least 7 digits for a phone number)
    if len(re.sub(r'\D', '', digits)) < 7:
        return ""

    return digits[:20]  # Max 20 chars


def sanitize_name(name: Optional[str]) -> str:
    """Clean name field."""
    if not name:
        return ""

    name = sanitize_string(name, max_length=200)

    # Remove obviously fake/test names
    lower = name.lower()
    fake_patterns = ['test', 'asdf', 'qwerty', 'xxxx', '1234', 'aaa', 'bbb']
    if any(p in lower for p in fake_patterns) and len(name) < 10:
        return ""

    return name


def sanitize_lead_data(data: dict) -> dict:
    """Sanitize all lead fields."""
    return {
        "email": sanitize_email(data.get("email")),
        "name": sanitize_name(data.get("name")),
        "first_name": sanitize_string(data.get("first_name"), max_length=100),
        "last_name": sanitize_string(data.get("last_name"), max_length=100),
        "phone": sanitize_phone(data.get("phone")),
        "company": sanitize_string(data.get("company"), max_length=200),
        "notes": sanitize_string(data.get("notes"), max_length=2000),
        "source": sanitize_string(data.get("source"), max_length=100),
    }


# --- Spam Detection ---

# Common spam patterns
SPAM_EMAIL_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'fakeinbox.com', 'trashmail.com', '10minutemail.com', 'temp-mail.org',
    'yopmail.com', 'getnada.com', 'sharklasers.com', 'maildrop.cc',
}

SPAM_KEYWORDS = [
    'buy now', 'click here', 'free money', 'earn cash', 'work from home',
    'casino', 'viagra', 'cialis', 'lottery', 'winner', 'congratulations',
    'bitcoin', 'crypto investment', 'forex', 'binary options',
    'nigerian prince', 'wire transfer', 'western union',
    '<script', 'javascript:', 'onclick=', 'onerror=',  # XSS attempts
]

SPAM_LINK_PATTERN = re.compile(r'https?://[^\s]{50,}')  # Very long URLs


def is_spam(data: dict) -> Tuple[bool, str]:
    """
    Check if lead data appears to be spam.
    Returns (is_spam, reason).
    """
    email = (data.get("email") or "").lower()
    name = (data.get("name") or "").lower()
    notes = (data.get("notes") or "").lower()
    all_text = f"{name} {notes} {data.get('company', '')}".lower()

    # Check disposable email domains
    if email:
        domain = email.split('@')[-1] if '@' in email else ''
        if domain in SPAM_EMAIL_DOMAINS:
            return True, f"Disposable email domain: {domain}"

    # Check for spam keywords
    for keyword in SPAM_KEYWORDS:
        if keyword in all_text:
            return True, f"Spam keyword detected: {keyword}"

    # Check for excessive links in notes
    notes_text = data.get("notes") or ""
    url_count = len(re.findall(r'https?://', notes_text))
    if url_count > 3:
        return True, f"Too many URLs in notes: {url_count}"

    # Check for very long URLs (often spam)
    if SPAM_LINK_PATTERN.search(notes_text):
        return True, "Suspicious long URL detected"

    # Check for all caps (shouting)
    if notes_text and len(notes_text) > 20:
        upper_ratio = sum(1 for c in notes_text if c.isupper()) / len(notes_text)
        if upper_ratio > 0.7:
            return True, "Excessive uppercase text"

    # Check for repeated characters
    if re.search(r'(.)\1{5,}', all_text):
        return True, "Repeated characters detected"

    return False, ""


# --- Rate Limiting ---

def check_rate_limit(
    db: Session,
    org_id: int,
    email: str,
    window_minutes: int = 5,
    max_submissions: int = 3,
) -> Tuple[bool, str]:
    """
    Check if this email has submitted too many times recently.
    Returns (is_rate_limited, reason).
    """
    cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)

    recent_count = (
        db.query(models.Lead)
        .filter(
            models.Lead.organization_id == org_id,
            models.Lead.email == email,
            models.Lead.created_at >= cutoff,
        )
        .count()
    )

    if recent_count >= max_submissions:
        return True, f"Rate limited: {recent_count} submissions in {window_minutes} minutes"

    return False, ""


# --- Deduplication ---

def find_duplicate(
    db: Session,
    org_id: int,
    email: str,
    window_hours: int = 24,
) -> Optional[models.Lead]:
    """
    Find an existing lead with the same email within the time window.
    Returns the existing lead if found, None otherwise.
    """
    cutoff = datetime.utcnow() - timedelta(hours=window_hours)

    existing = (
        db.query(models.Lead)
        .filter(
            models.Lead.organization_id == org_id,
            models.Lead.email == email,
            models.Lead.created_at >= cutoff,
        )
        .order_by(models.Lead.created_at.desc())
        .first()
    )

    return existing


def merge_lead_data(existing: models.Lead, new_data: dict) -> dict:
    """
    Merge new data into existing lead, keeping non-empty values.
    Returns dict of updated fields.
    """
    updates = {}

    # Fields that can be updated if empty or if new value is "better"
    merge_fields = ['name', 'first_name', 'last_name', 'phone', 'company']

    for field in merge_fields:
        existing_val = getattr(existing, field, None) or ""
        new_val = new_data.get(field) or ""

        # Update if existing is empty/placeholder and new has real data
        if (not existing_val or existing_val == "(not provided)") and new_val and new_val != "(not provided)":
            updates[field] = new_val

    # Append to notes if there's new content
    new_notes = new_data.get("notes") or ""
    existing_notes = existing.notes or ""

    if new_notes and new_notes not in existing_notes:
        # Don't duplicate auto-capture notes
        if "[Auto-captured" in new_notes and "[Auto-captured" in existing_notes:
            pass  # Skip duplicate auto-capture
        else:
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            updates["notes"] = f"{existing_notes}\n\n--- Update {timestamp} ---\n{new_notes}".strip()

    return updates


def process_lead(
    db: Session,
    org_id: int,
    data: dict,
    dedupe_window_hours: int = 24,
    rate_limit_window_minutes: int = 5,
    rate_limit_max: int = 3,
) -> Tuple[dict, Optional[str], Optional[models.Lead]]:
    """
    Process incoming lead data with sanitization, spam check, rate limit, and dedupe.

    Returns:
        (sanitized_data, rejection_reason, existing_lead)
        - rejection_reason is None if lead should be accepted
        - existing_lead is set if this is a duplicate that was merged
    """
    # Step 1: Sanitize
    sanitized = sanitize_lead_data(data)

    # Preserve organization_id and any other passthrough fields
    sanitized["organization_id"] = org_id

    # Check email is valid after sanitization
    if not sanitized["email"]:
        return sanitized, "Invalid email address", None

    # Step 2: Spam check
    is_spam_lead, spam_reason = is_spam(sanitized)
    if is_spam_lead:
        return sanitized, f"Spam detected: {spam_reason}", None

    # Step 3: Rate limiting
    is_limited, limit_reason = check_rate_limit(
        db, org_id, sanitized["email"],
        window_minutes=rate_limit_window_minutes,
        max_submissions=rate_limit_max,
    )
    if is_limited:
        return sanitized, limit_reason, None

    # Step 4: Deduplication
    existing = find_duplicate(db, org_id, sanitized["email"], window_hours=dedupe_window_hours)
    if existing:
        # Merge new data into existing lead
        updates = merge_lead_data(existing, sanitized)
        if updates:
            for key, value in updates.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
        return sanitized, None, existing  # Return existing lead (merged)

    return sanitized, None, None  # New lead, proceed normally
