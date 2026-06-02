from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = APP_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Serenity Evaluation Service"
    VERSION: str = "0.1.0"
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    DATABASE_URL: str = "postgresql+asyncpg://serenity:serenity@localhost:5432/serenity"

    OPENAI_API_KEY: str | None = None

    AI_SERVICE_URL: str = "http://localhost:8000"
    INTERNAL_API_TOKEN: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
