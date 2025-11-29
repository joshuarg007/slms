"""
Email service for Site2CRM

Provides a modular, scalable email sending system with:
- Plain text and HTML email support
- Reusable email templates
- Background task support
- Centralized configuration
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


# =============================================================================
# Core Email Sender
# =============================================================================

def send_email(
    subject: str,
    body_text: str,
    recipients: Iterable[str],
    body_html: Optional[str] = None,
) -> bool:
    """
    Generic email sender using SMTP based on settings in app.core.config.

    Args:
        subject: Email subject line
        body_text: Plain text body (required, used as fallback)
        recipients: List of recipient email addresses
        body_html: Optional HTML body for rich formatting

    Returns:
        True if email was sent successfully, False otherwise
    """
    # Feature flag
    if not settings.email_enabled:
        logger.debug("Email disabled, skipping send")
        return False

    # Basic config guardrails
    if not settings.email_smtp_host or not settings.email_from_address:
        logger.warning("Email SMTP not configured")
        return False

    recipient_list = list(recipients)
    if not recipient_list:
        logger.warning("No recipients provided")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = (
        f"{settings.email_from_name} <{settings.email_from_address}>"
        if settings.email_from_name
        else settings.email_from_address
    )
    msg["To"] = ", ".join(recipient_list)
    msg["Subject"] = subject

    # Attach plain text first (fallback)
    msg.attach(MIMEText(body_text, "plain"))

    # Attach HTML if provided (preferred by most clients)
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    try:
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
            logger.info(f"Email sent to {recipient_list}: {subject}")
            return True
    except Exception as exc:
        logger.warning("Email send failed: %r", exc)
        return False


# =============================================================================
# Email Templates
# =============================================================================

def _base_html_template(content: str, preview_text: str = "") -> str:
    """
    Base HTML email template with Site2CRM branding.
    """
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Site2CRM</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{font-family: Arial, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
    </div>

    <!-- Email container -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Content card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                            <img src="https://site2crm.io/logo.png" alt="Site2CRM" width="140" style="display: block; margin: 0 auto;">
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                            <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                                &copy; {datetime.now().year} Site2CRM. All rights reserved.<br>
                                <a href="https://site2crm.io/privacy" style="color: #6366f1; text-decoration: none;">Privacy Policy</a>
                                &nbsp;|&nbsp;
                                <a href="https://site2crm.io/terms" style="color: #6366f1; text-decoration: none;">Terms of Service</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def _button_html(text: str, url: str, color: str = "#6366f1") -> str:
    """Generate an HTML button for emails."""
    return f"""
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
    <tr>
        <td style="border-radius: 8px; background-color: {color};">
            <a href="{url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                {text}
            </a>
        </td>
    </tr>
</table>
"""


# =============================================================================
# Specific Email Types
# =============================================================================

def send_email_verification(
    recipient: str,
    verification_url: str,
    user_name: Optional[str] = None,
) -> bool:
    """
    Send email verification link to new user.
    """
    subject = "Verify Your Email - Site2CRM"
    greeting = f"Hi {user_name}," if user_name else "Hi there,"

    body_text = f"""
{greeting}

Welcome to Site2CRM! Please verify your email address to complete your registration.

Click the link below to verify your email:
{verification_url}

This link will expire in 24 hours.

If you didn't create an account with Site2CRM, you can safely ignore this email.

- The Site2CRM Team
"""

    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    Verify Your Email
</h1>
<p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    {greeting.replace(',', '')} Welcome to Site2CRM!
</p>
<p style="margin: 0 0 8px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    Please verify your email address to complete your registration and start capturing leads.
</p>
{_button_html("Verify Email", verification_url, "#10b981")}
<p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
    This link will expire in 24 hours.
</p>
<p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.6;">
    If you didn't create an account with Site2CRM, you can safely ignore this email.
</p>
"""

    body_html = _base_html_template(content, "Verify your email to complete registration")

    return send_email(subject, body_text, [recipient], body_html)


def send_password_reset_email(
    recipient: str,
    reset_url: str,
) -> bool:
    """
    Send password reset email with reset link.
    """
    subject = "Reset Your Site2CRM Password"

    # Plain text version
    body_text = f"""
Reset Your Password

You requested to reset your password for your Site2CRM account.

Click the link below to set a new password:
{reset_url}

This link will expire in 24 hours.

If you didn't request this, you can safely ignore this email.

- The Site2CRM Team
"""

    # HTML version
    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    Reset Your Password
</h1>
<p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    You requested to reset your password for your Site2CRM account.
</p>
<p style="margin: 0 0 8px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    Click the button below to set a new password:
</p>
{_button_html("Reset Password", reset_url)}
<p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
    This link will expire in 24 hours.
</p>
<p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.6;">
    If you didn't request this, you can safely ignore this email.
</p>
"""

    body_html = _base_html_template(content, "Reset your Site2CRM password")

    return send_email(subject, body_text, [recipient], body_html)


def send_welcome_email(
    recipient: str,
    user_name: Optional[str] = None,
) -> bool:
    """
    Send welcome email to new users.
    """
    subject = "Welcome to Site2CRM!"
    greeting = f"Hi {user_name}," if user_name else "Hi there,"

    body_text = f"""
{greeting}

Welcome to Site2CRM! We're excited to have you on board.

You can now start capturing leads from your website and syncing them directly to your CRM.

Here's how to get started:
1. Build your first form in the Form Builder
2. Connect your CRM (HubSpot, Salesforce, Pipedrive, or Nutshell)
3. Embed the form on your website with one line of code

Need help? Visit our documentation or contact support@site2crm.io

- The Site2CRM Team
"""

    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    Welcome to Site2CRM!
</h1>
<p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    {greeting.replace(',', '')} We're excited to have you on board.
</p>
<p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    You can now start capturing leads from your website and syncing them directly to your CRM.
</p>
<h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">
    Here's how to get started:
</h2>
<ol style="margin: 0 0 24px; padding-left: 20px; font-size: 16px; color: #3f3f46; line-height: 1.8;">
    <li>Build your first form in the Form Builder</li>
    <li>Connect your CRM (HubSpot, Salesforce, Pipedrive, or Nutshell)</li>
    <li>Embed the form on your website with one line of code</li>
</ol>
{_button_html("Go to Dashboard", "https://site2crm.io/app")}
<p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.6;">
    Need help? Check out our <a href="https://site2crm.io/docs" style="color: #6366f1;">documentation</a>
    or contact <a href="mailto:support@site2crm.io" style="color: #6366f1;">support@site2crm.io</a>
</p>
"""

    body_html = _base_html_template(content, "Welcome to Site2CRM! Get started capturing leads.")

    return send_email(subject, body_text, [recipient], body_html)


def send_new_lead_notification(
    recipients: Iterable[str],
    lead_name: str,
    lead_email: Optional[str] = None,
    lead_company: Optional[str] = None,
    source: Optional[str] = None,
    organization_name: Optional[str] = None,
) -> bool:
    """
    Send notification about a new lead to organization admins.
    """
    subject = (
        f"New Lead: {lead_name}" + (f" from {lead_company}" if lead_company else "")
    )

    # Build details list
    details = [f"Name: {lead_name}"]
    if lead_email:
        details.append(f"Email: {lead_email}")
    if lead_company:
        details.append(f"Company: {lead_company}")
    if source:
        details.append(f"Source: {source}")

    body_text = f"""
New Lead Created

A new lead has been captured{' for ' + organization_name if organization_name else ''}.

{chr(10).join(details)}

View this lead in your Site2CRM dashboard.

- The Site2CRM Team
"""

    details_html = "".join([
        f'<tr><td style="padding: 8px 0; color: #71717a; width: 100px;">{d.split(": ")[0]}:</td>'
        f'<td style="padding: 8px 0; color: #18181b; font-weight: 500;">{d.split(": ")[1]}</td></tr>'
        for d in details
    ])

    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    New Lead Captured
</h1>
<p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    A new lead has been captured{' for ' + organization_name if organization_name else ''}.
</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 24px; font-size: 15px;">
    {details_html}
</table>
{_button_html("View Lead", "https://site2crm.io/app/leads")}
"""

    body_html = _base_html_template(content, f"New lead: {lead_name}")

    return send_email(subject, body_text, recipients, body_html)


def send_user_invitation_email(
    recipient: str,
    temp_password: str,
    inviter_email: Optional[str] = None,
    organization_name: Optional[str] = None,
    role: str = "USER",
) -> bool:
    """
    Send invitation email to new user with temporary password.
    """
    subject = f"You've been invited to join Site2CRM"

    org_text = f" at {organization_name}" if organization_name else ""
    inviter_text = f" by {inviter_email}" if inviter_email else ""

    role_descriptions = {
        "OWNER": "full control over the organization",
        "ADMIN": "manage settings and users",
        "USER": "work with leads and reports",
        "READ_ONLY": "view-only access",
    }
    role_desc = role_descriptions.get(role, "access to the platform")

    body_text = f"""
You've Been Invited to Site2CRM

You've been invited to join Site2CRM{org_text}{inviter_text}.

Your role: {role} ({role_desc})

Here are your login credentials:
Email: {recipient}
Temporary Password: {temp_password}

Please log in and change your password immediately.

Login here: https://site2crm.io/login

- The Site2CRM Team
"""

    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    You've Been Invited!
</h1>
<p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    You've been invited to join Site2CRM{org_text}{inviter_text}.
</p>
<div style="margin: 24px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">Your role:</p>
    <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #6366f1;">
        {role}
        <span style="font-size: 14px; font-weight: 400; color: #71717a;"> - {role_desc}</span>
    </p>
    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">Your login credentials:</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; font-size: 15px;">
        <tr>
            <td style="padding: 4px 0; color: #71717a; width: 140px;">Email:</td>
            <td style="padding: 4px 0; color: #18181b; font-weight: 500;">{recipient}</td>
        </tr>
        <tr>
            <td style="padding: 4px 0; color: #71717a;">Temporary Password:</td>
            <td style="padding: 4px 0; color: #18181b; font-weight: 600; font-family: monospace; background-color: #fff; padding: 8px; border-radius: 4px;">{temp_password}</td>
        </tr>
    </table>
</div>
<p style="margin: 0 0 8px; font-size: 14px; color: #ef4444; font-weight: 500;">
    Please change your password after logging in.
</p>
{_button_html("Log In Now", "https://site2crm.io/login")}
<p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
    If you weren't expecting this invitation, you can safely ignore this email.
</p>
"""

    body_html = _base_html_template(content, f"You've been invited to join Site2CRM{org_text}")

    return send_email(subject, body_text, [recipient], body_html)


def send_contact_form_notification(
    recipients: Iterable[str],
    name: str,
    email: str,
    company: Optional[str] = None,
    message: Optional[str] = None,
    source: Optional[str] = None,
) -> bool:
    """
    Send notification about a contact form submission from the marketing site.
    """
    subject = f"New Contact Form Submission from {name}"

    body_text = f"""
New Contact Form Submission

Someone submitted the contact form on the Site2CRM website.

Name: {name}
Email: {email}
Company: {company or "Not provided"}
Source: {source or "Unknown"}

Message:
{message or "No message provided"}

- Site2CRM
"""

    message_html = f"""
<div style="margin-top: 16px; padding: 16px; background-color: #f4f4f5; border-radius: 8px; font-size: 15px; color: #3f3f46; line-height: 1.6;">
    {message or "<em>No message provided</em>"}
</div>
""" if message else ""

    content = f"""
<h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
    New Contact Form Submission
</h1>
<p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
    Someone submitted the contact form on the Site2CRM website.
</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 16px; font-size: 15px;">
    <tr>
        <td style="padding: 8px 0; color: #71717a; width: 100px;">Name:</td>
        <td style="padding: 8px 0; color: #18181b; font-weight: 500;">{name}</td>
    </tr>
    <tr>
        <td style="padding: 8px 0; color: #71717a;">Email:</td>
        <td style="padding: 8px 0; color: #18181b; font-weight: 500;">
            <a href="mailto:{email}" style="color: #6366f1;">{email}</a>
        </td>
    </tr>
    <tr>
        <td style="padding: 8px 0; color: #71717a;">Company:</td>
        <td style="padding: 8px 0; color: #18181b; font-weight: 500;">{company or "Not provided"}</td>
    </tr>
    <tr>
        <td style="padding: 8px 0; color: #71717a;">Source:</td>
        <td style="padding: 8px 0; color: #18181b; font-weight: 500;">{source or "Unknown"}</td>
    </tr>
</table>
{message_html}
"""

    body_html = _base_html_template(content, f"Contact form submission from {name}")

    return send_email(subject, body_text, recipients, body_html)
