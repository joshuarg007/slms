# main.py
import sys
import os
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.api.routes.salespeople_stats import router as salespeople_router
from app.api.routes import forms as forms_routes
from app.api.routes import public_forms as public_forms_routes
from app.api.routes import core as core_routes
from app.api.routes import orgs as orgs_routes
from app.api.routes import leads as leads_routes
from app.api.routes import auth as auth_routes
from app.api.routes import billing as billing_routes
from app.api.routes import users as users_routes
from app.api.routes import contact as contact_routes
from app.api.routes import password_reset as password_reset_routes
from app.api.routes import chat as chat_routes
from app.api.routes import analytics as analytics_routes

# Scheduler for digest emails
from app.services.scheduler import start_scheduler, stop_scheduler


# -----------------------------------
# Lifespan (startup/shutdown)
# -----------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start the scheduler
    start_scheduler()
    yield
    # Shutdown: stop the scheduler
    stop_scheduler()


# -----------------------------------
# App & CORS
# -----------------------------------
app = FastAPI(lifespan=lifespan)

# CORS: Specific origins for credentials, wildcard for public endpoints
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://site2crm.io",
    "https://www.site2crm.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Routers

app.include_router(billing_routes.router, prefix="/api", tags=["Billing"])
app.include_router(core_routes.router)
app.include_router(orgs_routes.router, prefix="/api", tags=["Orgs"])
app.include_router(leads_routes.router, prefix="/api", tags=["Leads"])
app.include_router(auth_routes.router, prefix="/api", tags=["Auth"])
app.include_router(users_routes.router, prefix="/api", tags=["Users"])
app.include_router(hubspot_stats_router, prefix="/api", tags=["HubSpot"])
app.include_router(pipedrive_stats_router, prefix="/api", tags=["Pipedrive"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(integrations.router, prefix="/api", tags=["Integrations"])
app.include_router(salesforce.router, prefix="/api", tags=["Salesforce"])
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

# DB
models.Base.metadata.create_all(bind=engine)

# ci: trigger deploy
