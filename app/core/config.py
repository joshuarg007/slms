from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional
import os


class Settings(BaseSettings):
    # Environment configuration
    environment: str = "development"  # development | staging | production
    log_level: str = "INFO"

    hubspot_api_key: str = ""
    # HubSpot OAuth
    hubspot_client_id: str = ""
    hubspot_client_secret: str = ""
    hubspot_redirect_uri: str = ""  # e.g. https://api.site2crm.io/api/integrations/hubspot/callback

    pipedrive_api_token: str = ""
    pipedrive_base_url: str = "https://api.pipedrive.com"
    # Pipedrive OAuth
    pipedrive_client_id: str = ""
    pipedrive_client_secret: str = ""
    pipedrive_redirect_uri: str = ""  # e.g. https://api.site2crm.io/api/integrations/pipedrive/callback

    # Salesforce OAuth
    salesforce_client_id: str = ""
    salesforce_client_secret: str = ""
    salesforce_redirect_uri: str = ""  # e.g. https://api.site2crm.io/api/integrations/salesforce/callback
    salesforce_login_base: str = "https://login.salesforce.com"  # use test.salesforce.com for sandbox

    # Zoho OAuth
    zoho_client_id: str = ""
    zoho_client_secret: str = ""
    zoho_redirect_uri: str = ""  # e.g. https://api.site2crm.io/api/integrations/zoho/callback
    zoho_accounts_url: str = "https://accounts.zoho.com"  # US datacenter, use .eu/.in/.com.au for others

    # Google OAuth (Social Login)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Nutshell
    nutshell_username: str = ""   # e.g. your-account@domain.com
    nutshell_api_key: str = ""    # Nutshell API key

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    # Plan price IDs (from Stripe Dashboard)
    stripe_price_starter_monthly: str = ""
    stripe_price_starter_annual: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_pro_annual: str = ""
    stripe_price_pro_ai_monthly: str = ""
    stripe_price_pro_ai_annual: str = ""

    # PayPal
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_mode: str = "sandbox"  # sandbox or live
    # PayPal Plan IDs (created via scripts/setup_paypal_plans.py)
    paypal_plan_starter_monthly: str = ""
    paypal_plan_starter_annual: str = ""
    paypal_plan_pro_monthly: str = ""
    paypal_plan_pro_annual: str = ""

    # AI Lead Consultant (Anthropic)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    frontend_base_url: str = "http://127.0.0.1:5173"
    api_base_url: str = "https://api.site2crm.io"  # Used for widget embed code

    # Email service
    email_enabled: bool = False
    email_smtp_host: str | None = None
    email_smtp_port: int = 587
    email_smtp_username: str | None = None
    email_smtp_password: str | None = None
    email_from_address: str | None = None
    email_from_name: str = "Site2CRM"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v.lower() not in allowed:
            raise ValueError(f"environment must be one of: {allowed}")
        return v.lower()

    @field_validator("stripe_secret_key")
    @classmethod
    def validate_stripe_key(cls, v: str) -> str:
        # Only validate in production if key is provided
        if v and not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError("stripe_secret_key must start with sk_test_ or sk_live_")
        return v

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"

    def validate_production_config(self) -> list[str]:
        """
        Validate that all required production settings are configured.
        Returns list of missing/invalid settings.
        """
        issues = []

        if self.is_production():
            if not self.stripe_secret_key:
                issues.append("STRIPE_SECRET_KEY is required in production")
            if not self.stripe_webhook_secret:
                issues.append("STRIPE_WEBHOOK_SECRET is required in production")
            if self.frontend_base_url == "http://127.0.0.1:5173":
                issues.append("FRONTEND_BASE_URL must be set to production URL")
            if not self.email_enabled:
                issues.append("EMAIL_ENABLED should be true in production")

        return issues


settings = Settings()

# Log any production configuration issues (but don't fail startup)
_config_issues = settings.validate_production_config()
if _config_issues:
    import logging
    _logger = logging.getLogger("app.config")
    for issue in _config_issues:
        _logger.warning(f"Configuration warning: {issue}")
