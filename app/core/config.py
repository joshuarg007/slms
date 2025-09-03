# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    hubspot_api_key: str = ""
    pipedrive_api_token: str = ""
    pipedrive_base_url: str = "https://api.pipedrive.com"

    # Stripe
    stripe_secret_key: str = ""           # sk_test_...
    stripe_webhook_secret: str = ""       # whsec_...
    stripe_price_id_pro: str = ""         # price_xxx (recurring)
    stripe_price_id_team: str = ""        # optional additional plan
    frontend_base_url: str = "http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
