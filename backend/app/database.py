from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings


settings = get_settings()
engine_kwargs = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_runtime_schema() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    case_columns = {
        "raw_material_id": "INTEGER",
        "source_category": "VARCHAR(40) DEFAULT 'crawled'",
        "source_title": "VARCHAR(255)",
        "platform": "VARCHAR(80)",
        "pipeline_stage": "VARCHAR(40) DEFAULT 'raw'",
        "structure_status": "VARCHAR(40) DEFAULT 'pending'",
        "review_status": "VARCHAR(40) DEFAULT 'pending'",
        "reference_value": "VARCHAR(20) DEFAULT 'medium'",
        "knowledge_score": "INTEGER DEFAULT 0",
        "structured_json": "TEXT",
        "ai_core_insight": "TEXT",
        "why_it_worked": "TEXT",
        "strategy_patterns": "TEXT",
        "emotional_mechanisms": "TEXT",
        "marketing_model": "VARCHAR(120)",
        "marketing_model_definition": "TEXT",
        "marketing_model_confidence": "FLOAT",
        "sub_models": "TEXT",
        "user_psychology_insights": "TEXT",
        "content_structure_model": "TEXT",
        "reusable_strategy_template": "TEXT",
        "knowledge_level": "VARCHAR(40)",
        "suitable_industries": "TEXT",
        "unsuitable_industries": "TEXT",
        "platform_strategy": "TEXT",
        "industry_tags": "TEXT",
        "platform_tags": "TEXT",
        "strategy_tags": "TEXT",
        "emotion_tags": "TEXT",
        "risk_points": "TEXT",
        "suitable_for": "TEXT",
        "not_suitable_for": "TEXT",
        "repeatable_patterns": "TEXT",
        "embedding_status": "VARCHAR(40) DEFAULT 'not_started'",
        "embedding_keywords": "TEXT",
        "embedding_vector": "TEXT",
        "embedding_error": "TEXT",
        "embedding_dimension": "INTEGER",
        "rag_enabled": "INTEGER DEFAULT 0",
        "callable_by_hotspot": "INTEGER DEFAULT 0",
        "callable_by_content": "INTEGER DEFAULT 0",
        "callable_by_campaign": "INTEGER DEFAULT 0",
        "callable_by_ppt": "INTEGER DEFAULT 0",
        "reviewed_by": "INTEGER",
        "reviewed_at": "DATETIME",
        "approved_by": "INTEGER",
        "approved_at": "DATETIME",
        "embedded_at": "DATETIME",
        "last_called_at": "DATETIME",
        "call_count": "INTEGER DEFAULT 0",
        "feedback_score": "FLOAT",
        "related_topics": "TEXT",
        "updated_at": "DATETIME",
    }
    with engine.begin() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(marketing_cases)"))}
        for name, definition in case_columns.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE marketing_cases ADD COLUMN {name} {definition}"))
        user_columns = {
            "role": "VARCHAR(40) DEFAULT 'viewer'",
            "permissions": "TEXT",
            "points_balance": "INTEGER DEFAULT 1000",
            "total_points_used": "INTEGER DEFAULT 0",
        }
        existing_users = {row[1] for row in conn.execute(text("PRAGMA table_info(user_accounts)"))}
        for name, definition in user_columns.items():
            if name not in existing_users:
                conn.execute(text(f"ALTER TABLE user_accounts ADD COLUMN {name} {definition}"))
        conn.execute(text("UPDATE user_accounts SET role = 'viewer' WHERE role IS NULL OR role = ''"))
        conn.execute(text("UPDATE user_accounts SET points_balance = 1000 WHERE (points_balance IS NULL OR points_balance = 0) AND (total_points_used IS NULL OR total_points_used = 0)"))
        conn.execute(text("UPDATE user_accounts SET total_points_used = 0 WHERE total_points_used IS NULL"))
        usage_columns = {
            "points_charged": "INTEGER",
            "duration_ms": "INTEGER",
            "success": "INTEGER DEFAULT 1",
            "error_message": "TEXT",
        }
        existing_usage = {row[1] for row in conn.execute(text("PRAGMA table_info(ai_usage_logs)"))}
        for name, definition in usage_columns.items():
            if name not in existing_usage:
                conn.execute(text(f"ALTER TABLE ai_usage_logs ADD COLUMN {name} {definition}"))
        recommendation_columns = {
            "is_favorite": "INTEGER DEFAULT 0",
        }
        existing_recommendations = {row[1] for row in conn.execute(text("PRAGMA table_info(topic_recommendations)"))}
        for name, definition in recommendation_columns.items():
            if name not in existing_recommendations:
                conn.execute(text(f"ALTER TABLE topic_recommendations ADD COLUMN {name} {definition}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
