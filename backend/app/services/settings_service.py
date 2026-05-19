from datetime import datetime

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import SystemSetting

SECRET_KEYS = {"deepseek_api_key", "embedding_api_key"}


def get_setting(db: Session, key: str) -> str | None:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else None


def set_setting(db: Session, key: str, value: str | None, is_secret: bool | None = None) -> SystemSetting:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row is None:
        row = SystemSetting(key=key, value=value, is_secret=1 if (is_secret if is_secret is not None else key in SECRET_KEYS) else 0)
        db.add(row)
    else:
        row.value = value
        if is_secret is not None:
            row.is_secret = 1 if is_secret else 0
        row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def admin_settings_payload(db: Session) -> dict:
    settings = get_settings()
    api_key = get_setting(db, "deepseek_api_key") or settings.deepseek_api_key or ""
    base_url = get_setting(db, "deepseek_base_url") or settings.deepseek_base_url
    model = get_setting(db, "deepseek_model") or settings.deepseek_model
    embedding_api_key = get_setting(db, "embedding_api_key") or settings.embedding_api_key or ""
    embedding_provider = get_setting(db, "embedding_provider") or settings.embedding_provider
    embedding_base_url = get_setting(db, "embedding_base_url") or settings.embedding_base_url
    embedding_model = get_setting(db, "embedding_model") or settings.embedding_model
    embedding_dimension = int(get_setting(db, "embedding_dimension") or settings.embedding_dimension)
    embedding_enabled = _as_bool(get_setting(db, "embedding_enabled"), settings.embedding_enabled)
    return {
        "deepseek_api_key_configured": bool(api_key),
        "deepseek_api_key_masked": _mask_secret(api_key),
        "deepseek_base_url": base_url,
        "deepseek_model": model,
        "embedding_provider": embedding_provider,
        "embedding_api_key_configured": bool(embedding_api_key),
        "embedding_api_key_masked": _mask_secret(embedding_api_key),
        "embedding_base_url": embedding_base_url,
        "embedding_model": embedding_model,
        "embedding_dimension": embedding_dimension,
        "embedding_enabled": embedding_enabled,
    }


def get_effective_deepseek_config(db: Session | None = None) -> dict:
    settings = get_settings()
    if db is None:
        return {
            "api_key": settings.llm_api_key or settings.deepseek_api_key or settings.openai_api_key,
            "base_url": settings.llm_base_url or settings.deepseek_base_url,
            "model": settings.llm_model or settings.deepseek_model,
        }
    return {
        "api_key": get_setting(db, "deepseek_api_key") or settings.llm_api_key or settings.deepseek_api_key or settings.openai_api_key,
        "base_url": get_setting(db, "deepseek_base_url") or settings.llm_base_url or settings.deepseek_base_url,
        "model": get_setting(db, "deepseek_model") or settings.llm_model or settings.deepseek_model,
    }


def get_effective_embedding_config(db: Session | None = None) -> dict:
    settings = get_settings()
    if db is None:
        return {
            "provider": settings.embedding_provider,
            "api_key": settings.embedding_api_key,
            "base_url": settings.embedding_base_url,
            "model": settings.embedding_model,
            "dimension": settings.embedding_dimension,
            "enabled": settings.embedding_enabled,
        }
    return {
        "provider": get_setting(db, "embedding_provider") or settings.embedding_provider,
        "api_key": get_setting(db, "embedding_api_key") or settings.embedding_api_key,
        "base_url": get_setting(db, "embedding_base_url") or settings.embedding_base_url,
        "model": get_setting(db, "embedding_model") or settings.embedding_model,
        "dimension": int(get_setting(db, "embedding_dimension") or settings.embedding_dimension),
        "enabled": _as_bool(get_setting(db, "embedding_enabled"), settings.embedding_enabled),
    }


def _mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}...{value[-4:]}"


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}
