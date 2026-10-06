import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotel Operations AI"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Current User Configuration for Human Overrides
    CURRENT_USER_NAME: str = "Amit Shah"
    CURRENT_USER_ROLE: str = "Hotel Manager"


    # Docker LLM & Provider Configuration
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "llama3.2"
    LLM_BASE_URL: str = "http://localhost:11434/v1"

    # Docker PostgreSQL Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "hotel_operations_db"
    DATABASE_URL: str = ""

    @property
    def sync_database_url(self) -> str:
        """Ensure Database URL uses psycopg2 driver format for SQLAlchemy and contains password."""
        url = self.DATABASE_URL
        password = self.POSTGRES_PASSWORD or "postgres"
        user = self.POSTGRES_USER or "postgres"
        db = self.POSTGRES_DB or "hotel_operations_db"

        if not url:
            url = f"postgresql+psycopg2://{user}:{password}@localhost:5432/{db}"
        else:
            if f"{user}@" in url and f":{password}@" not in url:
                url = url.replace(f"{user}@", f"{user}:{password}@")
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql+psycopg://"):
                url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
