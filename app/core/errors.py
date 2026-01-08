# app/core/errors.py
"""
Standardized error handling for Site2CRM API.

All API errors follow a consistent format:
{
    "error": "error_code",           # Machine-readable error code
    "message": "User-friendly msg",  # Human-readable message
    "status_code": 400,              # HTTP status code
    "details": {...}                 # Optional additional context
}
"""

from typing import Any, Optional
from pydantic import BaseModel
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    message: str
    status_code: int
    details: Optional[dict[str, Any]] = None


class APIError(HTTPException):
    """
    Custom API exception that produces standardized error responses.

    Usage:
        raise APIError(
            error="duplicate_subscription",
            message="You already have an active subscription for this plan.",
            status_code=400,
            details={"plan": "pro", "current_status": "active"}
        )
    """
    def __init__(
        self,
        error: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict[str, Any]] = None,
        log_level: str = "warning"
    ):
        self.error = error
        self.message = message
        self.status_code = status_code
        self.details = details
        self.log_level = log_level
        super().__init__(status_code=status_code, detail=message)


# Common error factory functions
def not_found(resource: str, identifier: Any = None) -> APIError:
    """Resource not found error."""
    details = {"resource": resource}
    if identifier:
        details["identifier"] = str(identifier)
    return APIError(
        error="not_found",
        message=f"{resource} not found.",
        status_code=404,
        details=details,
        log_level="info"
    )


def unauthorized(message: str = "Authentication required.") -> APIError:
    """Authentication required error."""
    return APIError(
        error="unauthorized",
        message=message,
        status_code=401,
        log_level="info"
    )


def forbidden(message: str = "You don't have permission to perform this action.") -> APIError:
    """Permission denied error."""
    return APIError(
        error="forbidden",
        message=message,
        status_code=403,
        log_level="warning"
    )


def bad_request(error: str, message: str, details: Optional[dict] = None) -> APIError:
    """Generic bad request error."""
    return APIError(
        error=error,
        message=message,
        status_code=400,
        details=details,
        log_level="info"
    )


def rate_limited(message: str, retry_after: int) -> APIError:
    """Rate limit exceeded error."""
    return APIError(
        error="rate_limited",
        message=message,
        status_code=429,
        details={"retry_after": retry_after},
        log_level="warning"
    )


def server_error(message: str = "An unexpected error occurred.") -> APIError:
    """Internal server error."""
    return APIError(
        error="internal_error",
        message=message,
        status_code=500,
        log_level="error"
    )


# Exception handlers to register with FastAPI app
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle APIError exceptions with standardized response."""
    log_func = getattr(logger, exc.log_level, logger.warning)
    log_func(
        f"API Error: {exc.error}",
        extra={
            "error_code": exc.error,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.error,
            message=exc.message,
            status_code=exc.status_code,
            details=exc.details
        ).model_dump()
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle standard HTTPException and convert to standardized format.
    This catches existing HTTPException raises and normalizes them.
    """
    # Map status codes to error codes
    error_codes = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
        500: "internal_error",
        502: "bad_gateway",
        503: "service_unavailable",
    }

    error_code = error_codes.get(exc.status_code, "error")

    # Handle nested detail objects (from existing code)
    if isinstance(exc.detail, dict):
        message = exc.detail.get("message", str(exc.detail))
        details = {k: v for k, v in exc.detail.items() if k not in ("message", "error")}
        if "error" in exc.detail:
            error_code = exc.detail["error"]
    else:
        message = str(exc.detail) if exc.detail else "An error occurred."
        details = None

    logger.warning(
        f"HTTP Exception: {error_code}",
        extra={
            "error_code": error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=error_code,
            message=message,
            status_code=exc.status_code,
            details=details if details else None
        ).model_dump(),
        headers=getattr(exc, "headers", None)
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors with user-friendly messages."""
    errors = exc.errors()

    # Build field-specific error messages
    field_errors = {}
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        field_errors[field] = error["msg"]

    logger.info(
        "Validation error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "fields": list(field_errors.keys())
        }
    )

    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="validation_error",
            message="Please check your input and try again.",
            status_code=422,
            details={"fields": field_errors}
        ).model_dump()
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    logger.error(
        f"Unhandled exception: {type(exc).__name__}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__
        }
    )

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_error",
            message="An unexpected error occurred. Please try again later.",
            status_code=500
        ).model_dump()
    )


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
