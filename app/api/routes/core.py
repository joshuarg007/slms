from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import text

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", include_in_schema=False)
def home():
    return HTMLResponse(
        """
        <!doctype html>
        <html>
          <head><meta charset="utf-8"><title>Site2CRM API</title></head>
          <body style="font: 14px system-ui; margin: 2rem;">
            <h1>Site2CRM API</h1>
            <p>Backend is running.</p>
            <ul>
              <li><a href="/docs">Open API Docs</a></li>
              <li><a href="http://127.0.0.1:5173/">Open Frontend (Vite)</a></li>
            </ul>
          </body>
        </html>
        """
    )


@router.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


def _check_health():
    """Check API and database health."""
    result = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "api": {"status": "healthy"},
            "database": {"status": "unknown"},
        }
    }

    # Check database connectivity
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        result["checks"]["database"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        result["checks"]["database"]["status"] = "unhealthy"
        result["checks"]["database"]["error"] = str(e)
        result["status"] = "degraded"

    return result


@router.get("/health", tags=["Core"])
def health():
    """
    Health check endpoint for monitoring services.

    Returns status of API and database connectivity.
    Use this endpoint for uptime monitoring (UptimeRobot, etc.).
    """
    return _check_health()


@router.get("/healthz", tags=["Core"])
def healthz():
    """Kubernetes-style health check (alias for /health)."""
    return _check_health()
