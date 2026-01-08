# tests/conftest.py
"""
Pytest configuration and fixtures for Site2CRM tests.
"""
import os
import sys
from datetime import datetime, timedelta
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables BEFORE importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_fake")
os.environ.setdefault("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_mo")
os.environ.setdefault("STRIPE_PRICE_STARTER_ANNUAL", "price_starter_yr")
os.environ.setdefault("STRIPE_PRICE_PRO_MONTHLY", "price_pro_mo")
os.environ.setdefault("STRIPE_PRICE_PRO_ANNUAL", "price_pro_yr")
os.environ.setdefault("STRIPE_PRICE_PRO_AI_MONTHLY", "price_pro_ai_mo")
os.environ.setdefault("STRIPE_PRICE_PRO_AI_ANNUAL", "price_pro_ai_yr")
os.environ.setdefault("FRONTEND_BASE_URL", "http://localhost:5173")

from app.db import models
from app.db.session import Base


# -----------------------------------------------------------------------------
# Database Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture(scope="function")
def test_engine():
    """Create a test database engine (in-memory SQLite)."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# -----------------------------------------------------------------------------
# App Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture(scope="function")
def app(db_session):
    """Create a test FastAPI app with overridden dependencies."""
    from main import app as fastapi_app
    from app.api.deps.auth import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(app) -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


# -----------------------------------------------------------------------------
# Mock Data Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
def test_org(db_session) -> models.Organization:
    """Create a test organization."""
    org = models.Organization(
        name="Test Organization",
        domain="test-org.example.com",
        api_key="test_api_key_123",
        plan="free",
        subscription_status="inactive",
        active_crm="hubspot",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_user(db_session, test_org) -> models.User:
    """Create a test user associated with the test organization."""
    from app.core.security import get_password_hash

    user = models.User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        organization_id=test_org.id,
        is_approved=True,
        email_verified=True,
        role="ADMIN",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    """Create authentication headers for API requests."""
    from app.core.security import create_access_token

    token = create_access_token(sub=test_user.email)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_lead(db_session, test_org) -> models.Lead:
    """Create a test lead."""
    lead = models.Lead(
        organization_id=test_org.id,
        name="John Doe",
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="555-123-4567",
        company="Test Company",
        status="new",
    )
    db_session.add(lead)
    db_session.commit()
    db_session.refresh(lead)
    return lead


@pytest.fixture
def test_form_config(db_session, test_org) -> models.FormConfig:
    """Create a test form config."""
    form = models.FormConfig(
        organization_id=test_org.id,
        form_style="inline",
        config_json='{"fields": [{"name": "email", "type": "email", "required": true}]}',
    )
    db_session.add(form)
    db_session.commit()
    db_session.refresh(form)
    return form


# -----------------------------------------------------------------------------
# Mock External Services
# -----------------------------------------------------------------------------
@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls."""
    with patch("stripe.Customer") as mock_customer, \
         patch("stripe.Subscription") as mock_subscription, \
         patch("stripe.checkout.Session") as mock_checkout:

        # Default mock returns
        mock_customer.create.return_value = MagicMock(id="cus_test123")
        mock_customer.list.return_value = MagicMock(data=[])

        mock_subscription.list.return_value = MagicMock(data=[])
        mock_subscription.modify.return_value = MagicMock(status="active")

        mock_checkout.create.return_value = MagicMock(
            url="https://checkout.stripe.com/test",
            id="cs_test123"
        )
        mock_checkout.list.return_value = MagicMock(data=[])

        yield {
            "customer": mock_customer,
            "subscription": mock_subscription,
            "checkout": mock_checkout,
        }


@pytest.fixture
def mock_hubspot():
    """Mock HubSpot API calls."""
    with patch("app.integrations.hubspot.get_owners") as mock_owners, \
         patch("app.integrations.hubspot.create_lead") as mock_create:

        mock_owners.return_value = [
            {"id": "1", "email": "sales@test.com", "firstName": "Sales", "lastName": "Rep"}
        ]
        mock_create.return_value = {"id": "lead_123"}

        yield {
            "get_owners": mock_owners,
            "create_lead": mock_create,
        }


# -----------------------------------------------------------------------------
# Utility Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
def sample_lead_data() -> dict:
    """Sample lead data for testing form submissions."""
    return {
        "email": "newlead@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "phone": "555-987-6543",
        "company": "New Company Inc",
        "message": "Interested in your product",
    }


@pytest.fixture
def malicious_lead_data() -> dict:
    """Malicious lead data for testing input sanitization."""
    return {
        "email": "test@example.com",
        "first_name": "<script>alert('xss')</script>",
        "last_name": "Smith\x00hidden",  # Null byte injection
        "phone": "555-123-4567; DROP TABLE leads;--",
        "company": "  Lots   of   spaces  ",
        "message": "&lt;escaped&gt; &amp; &#x27;entities&#x27;",
    }
