# app/core/logging_config.py
"""
Structured logging configuration for Site2CRM API.

Features:
- JSON-formatted logs for production (easy to parse in CloudWatch/ELK)
- Human-readable logs for development
- Request timing middleware
- Correlation IDs for request tracing
"""

import logging
import logging.config
import os
import sys
import time
import uuid
from typing import Callable
from contextvars import ContextVar

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable for request correlation ID
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDFilter(logging.Filter):
    """Add request_id to all log records."""
    def filter(self, record):
        record.request_id = request_id_ctx.get("")
        return True


class JSONFormatter(logging.Formatter):
    """JSON log formatter for production environments."""
    def format(self, record):
        import json
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", ""),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                if key not in (
                    "name", "msg", "args", "created", "filename", "funcName",
                    "levelname", "levelno", "lineno", "module", "msecs",
                    "pathname", "process", "processName", "relativeCreated",
                    "stack_info", "exc_info", "exc_text", "thread", "threadName",
                    "request_id", "message"
                ):
                    try:
                        log_data[key] = value
                    except (TypeError, ValueError):
                        log_data[key] = str(value)

        return json.dumps(log_data)


def get_log_level() -> str:
    """Get log level from environment."""
    return os.getenv("LOG_LEVEL", "INFO").upper()


def is_production() -> bool:
    """Check if running in production environment."""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def configure_logging():
    """
    Configure logging for the application.

    In production: JSON format, INFO level
    In development: Human-readable format, DEBUG level
    """
    log_level = get_log_level()
    use_json = is_production()

    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {
                "()": RequestIDFilter,
            }
        },
        "formatters": {
            "standard": {
                "format": "%(asctime)s [%(levelname)s] %(name)s [%(request_id)s]: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": JSONFormatter,
                "datefmt": "%Y-%m-%dT%H:%M:%S%z",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "json" if use_json else "standard",
                "filters": ["request_id"],
                "stream": sys.stdout,
            },
        },
        "loggers": {
            "": {  # Root logger
                "handlers": ["console"],
                "level": log_level,
                "propagate": True,
            },
            "app": {  # Application logger
                "handlers": ["console"],
                "level": "DEBUG" if not is_production() else "INFO",
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["console"],
                "level": "WARNING",  # Reduce access log noise
                "propagate": False,
            },
            "sqlalchemy.engine": {
                "handlers": ["console"],
                "level": "WARNING",  # Only show SQL warnings/errors
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(config)

    # Log startup info
    logger = logging.getLogger("app")
    logger.info(
        "Logging configured",
        extra={
            "log_level": log_level,
            "environment": os.getenv("ENVIRONMENT", "development"),
            "json_format": use_json
        }
    )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log requests and add timing/correlation IDs.

    Adds:
    - X-Request-ID header (generated if not present)
    - X-Process-Time header (request duration in seconds)
    - Request/response logging
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request_id_ctx.set(request_id)

        logger = logging.getLogger("app.request")

        # Log request start
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "event": "request_start",
                "method": request.method,
                "path": request.url.path,
                "query": str(request.query_params) if request.query_params else None,
                "client_ip": request.client.host if request.client else None,
            }
        )

        # Time the request
        start_time = time.time()

        try:
            response = await call_next(request)
        except Exception as e:
            # Log unhandled exceptions
            duration = time.time() - start_time
            logger.error(
                f"{request.method} {request.url.path} - ERROR",
                exc_info=True,
                extra={
                    "event": "request_error",
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration * 1000, 2),
                    "error": str(e),
                }
            )
            raise

        duration = time.time() - start_time

        # Add headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration:.4f}"

        # Log request completion
        log_level = "info"
        if response.status_code >= 500:
            log_level = "error"
        elif response.status_code >= 400:
            log_level = "warning"
        elif duration > 1.0:
            log_level = "warning"  # Slow request

        getattr(logger, log_level)(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "event": "request_complete",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "slow_request": duration > 1.0,
            }
        )

        return response
