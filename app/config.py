import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotel Operations AI"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Docker LLM & Provider Configuration
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "llama3.2"
    LLM_BASE_URL: str = "http://localhost:11434/v1"

    # Docker PostgreSQL Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "hotel_operations_db"
    DATABASE_URL: str = ""

    @property
    def sync_database_url(self) -> str:
        """Ensure Database URL uses psycopg 3 driver format for SQLAlchemy 2.x."""
        url = self.DATABASE_URL
        if not url:
            password_part = f":{self.POSTGRES_PASSWORD}" if self.POSTGRES_PASSWORD else ""
            url = f"postgresql+psycopg://{self.POSTGRES_USER}{password_part}@localhost:5432/{self.POSTGRES_DB}"
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
