"""Application configuration for the Serenity AI service."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


APP_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = APP_ROOT / ".env"


class Settings(BaseSettings):
    """Settings loaded only from apps/ai-service/.env and process env."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Serenity AI Service"
    VERSION: str = "0.1.0"
    APP_ENV: str = "local"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    DATABASE_URL: str | None = None

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-5.4-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_FINAL_TRANSCRIPTION_MODEL: str = "gpt-4o-transcribe-diarize"
    OPENAI_REALTIME_TRANSCRIPTION_MODEL: str = "gpt-4o-transcribe"

    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    LANGFUSE_PUBLIC_KEY: str | None = None
    LANGFUSE_SECRET_KEY: str | None = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    GATEWAY_URL: str = "http://localhost:2991"
    WORKSPACE_API_BASE_URL: str | None = None
    CORE_SERVICE_BASE_URL: str = "http://localhost:2993/api"
    REALTIME_SERVICE_BASE_URL: str = "http://localhost:3002"
    INTERNAL_API_TOKEN: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def openai_api_key_secret() -> SecretStr | None:
    return SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None


def openai_api_key_value() -> str | None:
    return settings.OPENAI_API_KEY


def use_external_persistence() -> bool:
    return bool(settings.DATABASE_URL) and settings.APP_ENV not in {"local", "test"}
