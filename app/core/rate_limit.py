"""
Rate limiting middleware and utilities for Site2CRM

Provides in-memory rate limiting with configurable limits per endpoint.
For production, consider using Redis for distributed rate limiting.
"""
import time
from collections import defaultdict
from threading import Lock
from typing import Optional
from functools import wraps

from fastapi import HTTPException, Request


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window algorithm.

    For production with multiple workers/instances, replace with Redis-based solution.
    """

    def __init__(self):
        # {key: [(timestamp, count), ...]}
        self._requests: dict[str, list[tuple[float, int]]] = defaultdict(list)
        self._lock = Lock()

    def _cleanup_old_requests(self, key: str, window_seconds: int):
        """Remove requests outside the current window."""
        cutoff = time.time() - window_seconds
        self._requests[key] = [
            (ts, count) for ts, count in self._requests[key]
            if ts > cutoff
        ]

    def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        """
        Check if a key is rate limited.

        Returns:
            (is_limited, current_count, retry_after_seconds)
        """
        with self._lock:
            self._cleanup_old_requests(key, window_seconds)

            current_count = sum(count for _, count in self._requests[key])

            if current_count >= max_requests:
                # Calculate retry-after
                if self._requests[key]:
                    oldest = min(ts for ts, _ in self._requests[key])
                    retry_after = int(oldest + window_seconds - time.time()) + 1
                else:
                    retry_after = window_seconds
                return True, current_count, max(1, retry_after)

            # Record this request
            self._requests[key].append((time.time(), 1))
            return False, current_count + 1, 0

    def get_client_key(self, request: Request, endpoint: str) -> str:
        """
        Generate a unique key for rate limiting based on client IP and endpoint.
        """
        # Get client IP (handle proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"{endpoint}:{client_ip}"


# Global rate limiter instance
rate_limiter = RateLimiter()


# Rate limit configurations for different endpoints
RATE_LIMITS = {
    "contact": {"max_requests": 5, "window_seconds": 3600},      # 5 per hour
    "forgot_password": {"max_requests": 5, "window_seconds": 3600},  # 5 per hour
    "login": {"max_requests": 10, "window_seconds": 300},        # 10 per 5 minutes
    "signup": {"max_requests": 5, "window_seconds": 3600},       # 5 per hour
    "public_form": {"max_requests": 30, "window_seconds": 60},   # 30 per minute
    "public_api": {"max_requests": 60, "window_seconds": 60},    # 60 per minute (API key based)
    "chat_widget": {"max_requests": 20, "window_seconds": 60},   # 20 messages per minute per IP
    "default": {"max_requests": 100, "window_seconds": 60},      # 100 per minute
}


# Friendly AI-style rate limit messages for chat widget
CHAT_RATE_LIMIT_MESSAGES = [
    "Hmm, my memory isn't what it used to be... Give me a moment to catch up! 🤔",
    "Whoa, you're fast! Let me take a quick breather and I'll be right with you. ⏳",
    "I'm thinking really hard here! Mind waiting just a few seconds? 🧠",
    "Hold that thought! I need a quick moment to process everything. 💭",
    "You're keeping me on my toes! Let me catch my breath real quick. 😅",
]


def check_chat_widget_rate_limit(request: Request) -> tuple[bool, Optional[str]]:
    """
    Check rate limit for chat widget. Returns friendly AI message if limited.

    Returns:
        (is_limited, friendly_message) - message is None if not limited
    """
    import random

    config = RATE_LIMITS["chat_widget"]
    key = rate_limiter.get_client_key(request, "chat_widget")
    is_limited, count, retry_after = rate_limiter.is_rate_limited(
        key, config["max_requests"], config["window_seconds"]
    )

    if is_limited:
        message = random.choice(CHAT_RATE_LIMIT_MESSAGES)
        return True, message

    return False, None


def check_rate_limit(
    request: Request,
    endpoint: str,
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
):
    """
    Check rate limit for a request. Raises HTTPException if rate limited.

    Args:
        request: FastAPI request object
        endpoint: Name of the endpoint for rate limit config
        max_requests: Override max requests (optional)
        window_seconds: Override window seconds (optional)

    Raises:
        HTTPException: 429 Too Many Requests if rate limited
    """
    # Get config
    config = RATE_LIMITS.get(endpoint, RATE_LIMITS["default"])
    max_req = max_requests or config["max_requests"]
    window = window_seconds or config["window_seconds"]

    # Generate key and check
    key = rate_limiter.get_client_key(request, endpoint)
    is_limited, count, retry_after = rate_limiter.is_rate_limited(key, max_req, window)

    if is_limited:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Too many requests",
                "message": f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )


def rate_limit(endpoint: str):
    """
    Decorator for rate limiting endpoints.

    Usage:
        @router.post("/contact")
        @rate_limit("contact")
        def submit_contact(request: Request, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Find request in args or kwargs
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request:
                check_rate_limit(request, endpoint)

            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request:
                check_rate_limit(request, endpoint)

            return func(*args, **kwargs)

        # Return appropriate wrapper based on whether func is async
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
