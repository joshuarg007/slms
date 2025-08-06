import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    hubspot_api_key: str

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
