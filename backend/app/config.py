from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Hotspot Radar"
    database_url: str = "postgresql+psycopg2://hotspot:hotspot@postgres:5432/hotspot_radar"
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str = "gpt-4o-mini"
    llm_provider: str = "deepseek"
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model: str | None = None
    embedding_provider: str = "mock"
    embedding_api_key: str | None = None
    embedding_base_url: str = "https://open.bigmodel.cn/api/paas/v4/embeddings"
    embedding_model: str = "embedding-3"
    embedding_dimension: int = 1024
    embedding_enabled: bool = False
    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
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
    admin_username: str = "admin"
    admin_password: str = "admin1234"
    admin_open_ids: str = ""
    ai_topic_cost_points: int = 10
    digitaling_daily_import_enabled: bool = True
    digitaling_import_limit: int = 100
    hotspot_refresh_interval_minutes: int = 30

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def is_auth_required(settings: Settings | None = None) -> bool:
    current = settings or get_settings()
    feishu_ready = bool(current.feishu_app_id and current.feishu_app_secret and current.feishu_redirect_uri)
    return current.auth_required or feishu_ready
