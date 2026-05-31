from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
import os

# Find .env in project root (one level up from backend/) — only for local dev
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
_ENV_PATH = str(_ENV_FILE) if _ENV_FILE.exists() else None


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = ""

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "interviewos"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # Auth
    jwt_secret: str = "interviewgpt-secret-change-in-production"

    class Config:
        env_file = _ENV_PATH or ""
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
