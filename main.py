# main.py
import sys
import os
import logging
from contextlib import asynccontextmanager

# Load .env FIRST before any other imports that might need env vars
from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.path.dirname(__file__))

# Configure logging FIRST before any other imports
from app.core.logging_config import configure_logging, RequestLoggingMiddleware
configure_logging()

logger = logging.getLogger("app")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.errors import register_exception_handlers
from app.db.session import engine
from app.db import models
from app.api.routes.integrations_current import router as integrations_current_router
from app.api.routes.hubspot_stats import router as hubspot_stats_router
from app.api.routes.pipedrive_stats import router as pipedrive_stats_router
from app.api.routes import reports
from app.api.routes import integrations
from app.api.routes.integrations_update import router as integrations_update_router
from app.api.routes.integrations_notifications import router as integrations_notifications_router
from app.api.routes import salesforce
from app.api.routes import hubspot_oauth
from app.api.routes import pipedrive_oauth
from app.api.routes import zoho_oauth
from app.api.routes import nutshell
from app.api.routes.salespeople_stats import router as salespeople_router
from app.api.routes import forms as forms_routes
from app.api.routes import public_forms as public_forms_routes
from app.api.routes import core as core_routes
from app.api.routes import orgs as orgs_routes
from app.api.routes import leads as leads_routes
from app.api.routes import auth as auth_routes
from app.api.routes import google_auth as google_auth_routes
from app.api.routes import billing as billing_routes
from app.api.routes import paypal as paypal_routes
from app.api.routes import users as users_routes
from app.api.routes import contact as contact_routes
from app.api.routes import password_reset as password_reset_routes
from app.api.routes import chat as chat_routes
from app.api.routes import analytics as analytics_routes
from app.api.routes import scoring as scoring_routes
from app.api.routes import gamification as gamification_routes
from app.api.routes import automation as automation_routes
from app.api.routes import support as support_routes
from app.api.routes import appsumo as appsumo_routes
from app.api.routes import ab_tests as ab_tests_routes
from app.api.routes import chat_widget as chat_widget_routes

# Scheduler for digest emails
from app.services.scheduler import start_scheduler, stop_scheduler


# -----------------------------------
# Lifespan (startup/shutdown)
# -----------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start the scheduler
    logger.info("Application starting up", extra={"event": "startup"})
    start_scheduler()
    yield
    # Shutdown: stop the scheduler
    logger.info("Application shutting down", extra={"event": "shutdown"})
    stop_scheduler()


# -----------------------------------
# App & CORS
# -----------------------------------
app = FastAPI(
    title="Site2CRM API",
    description="""
Site2CRM API - Lead capture forms that sync directly to your CRM.

## Features
- **Lead Management**: Create, update, and track leads
- **CRM Integrations**: HubSpot, Salesforce, Pipedrive, Zoho, Nutshell
- **Form Builder**: Embeddable forms with custom styling
- **Analytics**: Lead scoring, pipeline tracking, team performance
- **Billing**: Stripe-powered subscription management

## Authentication
Most endpoints require a Bearer token. Get one via `/api/auth/login`.

## Rate Limits
- Login: 10 requests / 5 minutes
- Signup: 5 requests / hour
- Public forms: 30 requests / minute
""",
    version="1.0.0",
    contact={
        "name": "Axion Deep Labs",
        "email": "labs@axiondeep.com",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Configuration
# - Dashboard needs credentials (cookies/auth tokens) so requires specific origins
# - Public API (/api/public/*) uses X-Org-Key header auth - allows any origin
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

DASHBOARD_ORIGINS = [
    # Production
    "https://site2crm.io",
    "https://www.site2crm.io",
    "https://api.site2crm.io",
    # Development
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

class DualCORSMiddleware(BaseHTTPMiddleware):
    """
    Custom CORS middleware that handles two scenarios:
    1. Public API routes (/api/public/*): Allow any origin, no credentials
    2. Dashboard routes: Specific origins with credentials
    """
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        path = request.url.path

        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)

        # Public API routes - allow any origin (uses X-Org-Key header auth)
        if path.startswith("/api/public/"):
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Org-Key, Accept, Origin"
            response.headers["Access-Control-Expose-Headers"] = "Content-Type, X-Request-Id, X-Process-Time"
            # No credentials for public API
        # Dashboard routes - specific origins with credentials
        elif origin in DASHBOARD_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Org-Key, X-Requested-With, Accept, Origin"
            response.headers["Access-Control-Expose-Headers"] = "Content-Type, X-Request-Id, X-Process-Time"

        return response

app.add_middleware(DualCORSMiddleware)

# Add request logging middleware (tracks timing, adds correlation IDs)
app.add_middleware(RequestLoggingMiddleware)

# Register standardized error handlers
register_exception_handlers(app)

logger.info("Application initialized", extra={
    "event": "app_init",
    "cors_origins": DASHBOARD_ORIGINS,
    "docs_url": "/docs"
})


# Routers

app.include_router(billing_routes.router, prefix="/api", tags=["Billing"])
app.include_router(paypal_routes.router, prefix="/api", tags=["PayPal Billing"])
app.include_router(core_routes.router)
app.include_router(orgs_routes.router, prefix="/api", tags=["Orgs"])
app.include_router(leads_routes.router, prefix="/api", tags=["Leads"])
app.include_router(auth_routes.router, prefix="/api", tags=["Auth"])
app.include_router(google_auth_routes.router, prefix="/api", tags=["Auth: Google"])
app.include_router(users_routes.router, prefix="/api", tags=["Users"])
app.include_router(hubspot_stats_router, prefix="/api", tags=["HubSpot"])
app.include_router(pipedrive_stats_router, prefix="/api", tags=["Pipedrive"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(integrations.router, prefix="/api", tags=["Integrations"])
app.include_router(salesforce.router, prefix="/api", tags=["Salesforce"])
app.include_router(hubspot_oauth.router, prefix="/api", tags=["HubSpot OAuth"])
app.include_router(pipedrive_oauth.router, prefix="/api", tags=["Pipedrive OAuth"])
app.include_router(zoho_oauth.router, prefix="/api", tags=["Zoho OAuth"])
app.include_router(nutshell.router, prefix="/api", tags=["Nutshell"])
#app.include_router(salespeople_unified_router, prefix="/api", tags=["Salespeople"])
app.include_router(salespeople_router, prefix="/api", tags=["Salespeople"])
app.include_router(integrations_current_router, prefix="/api", tags=["Integrations"])
app.include_router(integrations_update_router, prefix="/api", tags=["Integrations"])
app.include_router(integrations_notifications_router, prefix="/api", tags=["Integrations"])
app.include_router(forms_routes.router, prefix="/api", tags=["Forms"])
app.include_router(public_forms_routes.router, prefix="/api", tags=["Public Forms"])
app.include_router(contact_routes.router, prefix="/api", tags=["Contact"])
app.include_router(password_reset_routes.router, prefix="/api", tags=["Auth"])
app.include_router(chat_routes.router, prefix="/api", tags=["AI Chat"])
app.include_router(analytics_routes.router, prefix="/api", tags=["Analytics"])
app.include_router(scoring_routes.router, prefix="/api", tags=["Lead Scoring"])
app.include_router(gamification_routes.router, prefix="/api", tags=["Gamification"])
app.include_router(automation_routes.router, prefix="/api", tags=["Automation"])
app.include_router(support_routes.router, prefix="/api", tags=["Support"])
app.include_router(appsumo_routes.router, prefix="/api", tags=["AppSumo"])
app.include_router(ab_tests_routes.router, prefix="/api", tags=["A/B Testing"])
app.include_router(chat_widget_routes.router, prefix="/api", tags=["Chat Widget"])
app.include_router(chat_widget_routes.public_router, prefix="/api", tags=["Public Chat Widget"])

# DB
models.Base.metadata.create_all(bind=engine)


# -----------------------------------
# Health Check Endpoints
# -----------------------------------
from datetime import datetime
from sqlalchemy import text

@app.get("/health", tags=["Health"])
def health_check():
    """Basic health check endpoint for load balancers."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/health/ready", tags=["Health"])
def readiness_check():
    """
    Readiness check that verifies database connectivity.
    Returns 503 if database is unreachable.
    """
    from app.db.session import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        logger.error(
            "Database health check failed",
            exc_info=True,
            extra={"event": "health_check_failed", "error": str(e)}
        )
        from fastapi import Response
        return Response(
            content='{"status": "error", "database": "disconnected"}',
            status_code=503,
            media_type="application/json"
        )


# ci: trigger deploy
