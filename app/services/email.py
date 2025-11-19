import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    subject: str,
    body_text: str,
    recipients: Iterable[str],
) -> None:
    """
    Generic email sender using SMTP based on settings in app.core.config.
    No effect if email_enabled is False.

    Any SMTP errors are logged for developers but never raised to callers.
    """

    # Feature flag
    if not settings.email_enabled:
        return

    # Basic config guardrails
    if not settings.email_smtp_host or not settings.email_from_address:
        return

    msg = MIMEMultipart()
    msg["From"] = (
        f"{settings.email_from_name} <{settings.email_from_address}>"
        if settings.email_from_name
        else settings.email_from_address
    )
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject

    msg.attach(MIMEText(body_text, "plain"))

    try:
        # Add a sane timeout so we never hang the app if SMTP is unreachable
        with smtplib.SMTP(
            settings.email_smtp_host,
            settings.email_smtp_port,
            timeout=10,
        ) as server:
            server.starttls()
            if settings.email_smtp_username and settings.email_smtp_password:
                server.login(
                    settings.email_smtp_username,
                    settings.email_smtp_password,
                )
            server.send_message(msg)
    except Exception as exc:
        # Log for developers, never surface to organizations
        logger.warning("Email send failed: %r", exc)
        return


def send_new_lead_notification(
    recipients: Iterable[str],
    lead_name: str,
    source: str | None,
    organization_name: str | None,
) -> None:
    """
    Helper for sending new lead created notifications.
    """

    subject = (
        f"New lead created in {organization_name}"
        if organization_name
        else "New lead created"
    )

    lines = [
        "A new lead has been created.",
        "",
        f"Name: {lead_name}",
    ]

    if source:
        lines.append(f"Source: {source}")

    body = "\n".join(lines)

    send_email(
        subject=subject,
        body_text=body,
        recipients=recipients,
    )
