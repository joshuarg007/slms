from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    hubspot_api_key: str = ""
    # HubSpot OAuth
    hubspot_client_id: str = ""
    hubspot_client_secret: str = ""
    hubspot_redirect_uri: str = ""  # e.g. https://api.site2crm.io/api/integrations/hubspot/callback

    pipedrive_api_token: str = ""
    pipedrive_base_url: str = "https://api.pipedrive.com"

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

settings = Settings()
