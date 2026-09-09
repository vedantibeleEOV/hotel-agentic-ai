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
        """Ensure Database URL uses psycopg 3 driver format for SQLAlchemy 2.x and contains password."""
        url = self.DATABASE_URL
        password = self.POSTGRES_PASSWORD or "postgres"
        user = self.POSTGRES_USER or "postgres"
        db = self.POSTGRES_DB or "hotel_operations_db"

        if not url:
            url = f"postgresql+psycopg://{user}:{password}@localhost:5432/{db}"
        else:
            if f"{user}@" in url and f":{password}@" not in url:
                url = url.replace(f"{user}@", f"{user}:{password}@")
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
