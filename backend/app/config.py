"""Application configuration — everything via environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "LinguaFlow AI"
    # IMPORTANT: set a long random SECRET_KEY in production (.env or env var).
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # SQLite for dev; Postgres in production, e.g.
    # postgresql+psycopg://user:pass@host:5432/linguaflow
    database_url: str = "sqlite:///./linguaflow.db"

    # Comma-separated origins allowed to call the API (dev: vite servers).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Where the built frontend lives, relative to backend/. Served at / in prod.
    frontend_dist: str = "../dist"


settings = Settings()
