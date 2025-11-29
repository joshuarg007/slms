"""
CAPTCHA verification for Site2CRM

Uses Google reCAPTCHA v3 for invisible bot protection.
"""
import os
import logging
from typing import Optional

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# reCAPTCHA configuration
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_ENABLED = bool(RECAPTCHA_SECRET_KEY)
RECAPTCHA_MIN_SCORE = float(os.getenv("RECAPTCHA_MIN_SCORE", "0.5"))


async def verify_captcha(
    token: Optional[str],
    action: Optional[str] = None,
    min_score: float = RECAPTCHA_MIN_SCORE,
) -> bool:
    """
    Verify a reCAPTCHA v3 token.

    Args:
        token: The reCAPTCHA response token from the frontend
        action: Expected action name (for verification)
        min_score: Minimum score to consider valid (0.0 - 1.0)

    Returns:
        True if verification passed, raises HTTPException otherwise

    Raises:
        HTTPException: 400 if CAPTCHA verification fails
    """
    # Skip if CAPTCHA is not configured
    if not RECAPTCHA_ENABLED:
        logger.debug("reCAPTCHA not configured, skipping verification")
        return True

    if not token:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "captcha_required",
                "message": "CAPTCHA verification is required",
            }
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={
                    "secret": RECAPTCHA_SECRET_KEY,
                    "response": token,
                },
                timeout=10.0,
            )

            result = response.json()
            logger.debug(f"reCAPTCHA response: {result}")

            # Check if verification succeeded
            if not result.get("success", False):
                error_codes = result.get("error-codes", [])
                logger.warning(f"reCAPTCHA verification failed: {error_codes}")
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "captcha_failed",
                        "message": "CAPTCHA verification failed. Please try again.",
                    }
                )

            # Check score (reCAPTCHA v3)
            score = result.get("score", 0)
            if score < min_score:
                logger.warning(f"reCAPTCHA score too low: {score} < {min_score}")
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "captcha_low_score",
                        "message": "Request blocked due to suspicious activity. Please try again.",
                    }
                )

            # Check action if specified
            if action and result.get("action") != action:
                logger.warning(
                    f"reCAPTCHA action mismatch: expected {action}, got {result.get('action')}"
                )
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "captcha_action_mismatch",
                        "message": "CAPTCHA verification failed. Please try again.",
                    }
                )

            logger.info(f"reCAPTCHA verified successfully, score: {score}")
            return True

    except httpx.RequestError as e:
        logger.error(f"reCAPTCHA request failed: {e}")
        # Fail open in case of network issues (you may want to fail closed instead)
        return True


def verify_captcha_sync(
    token: Optional[str],
    action: Optional[str] = None,
    min_score: float = RECAPTCHA_MIN_SCORE,
) -> bool:
    """
    Synchronous version of verify_captcha.
    """
    import asyncio

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(verify_captcha(token, action, min_score))
