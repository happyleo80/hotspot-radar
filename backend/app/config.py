from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Hotspot Radar"
    database_url: str = "postgresql+psycopg2://hotspot:hotspot@postgres:5432/hotspot_radar"
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str = "gpt-4o-mini"
    tianapi_key: str | None = None
    alapi_key: str | None = None
    tophub_api_key: str | None = None
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    frontend_url: str = "http://localhost:3000"
    auth_required: bool = False
    auth_session_secret: str = "change-me-in-production"
    feishu_app_id: str | None = None
    feishu_app_secret: str | None = None
    feishu_redirect_uri: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
