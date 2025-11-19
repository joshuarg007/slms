from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    hubspot_api_key: str = ""
    pipedrive_api_token: str = ""
    pipedrive_base_url: str = "https://api.pipedrive.com"

    # Nutshell
    nutshell_username: str = ""   # e.g. your-account@domain.com
    nutshell_api_key: str = ""    # Nutshell API key

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_team: str = ""

    frontend_base_url: str = "http://127.0.0.1:5173"

    # Email service
    email_enabled: bool = False
    email_smtp_host: str | None = None
    email_smtp_port: int = 587
    email_smtp_username: str | None = None
    email_smtp_password: str | None = None
    email_from_address: str | None = None
    email_from_name: str = "SLMS"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
