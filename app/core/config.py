# app/core/config.py
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

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
