from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MarketingCase(Base):
    __tablename__ = "marketing_cases"
    __table_args__ = (UniqueConstraint("source_url", name="uq_marketing_case_source_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(40), default="digitaling", index=True)
    source_url: Mapped[str] = mapped_column(Text)
    source_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    creativity: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_highlights: Mapped[str | None] = mapped_column(Text, nullable=True)
    communication_effect: Mapped[str | None] = mapped_column(Text, nullable=True)
    reusable_methods: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_material_id: Mapped[int | None] = mapped_column(ForeignKey("case_raw_materials.id"), nullable=True, index=True)
    source_category: Mapped[str] = mapped_column(String(40), default="crawled", index=True)
    platform: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    pipeline_stage: Mapped[str] = mapped_column(String(40), default="raw", index=True)
    structure_status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    review_status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    reference_value: Mapped[str] = mapped_column(String(20), default="medium", index=True)
    knowledge_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    structured_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_core_insight: Mapped[str | None] = mapped_column(Text, nullable=True)
    why_it_worked: Mapped[str | None] = mapped_column(Text, nullable=True)
    strategy_patterns: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotional_mechanisms: Mapped[str | None] = mapped_column(Text, nullable=True)
    marketing_model: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    marketing_model_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    marketing_model_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    sub_models: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_psychology_insights: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_structure_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    reusable_strategy_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    knowledge_level: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    suitable_industries: Mapped[str | None] = mapped_column(Text, nullable=True)
    unsuitable_industries: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    strategy_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotion_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_points: Mapped[str | None] = mapped_column(Text, nullable=True)
    suitable_for: Mapped[str | None] = mapped_column(Text, nullable=True)
    not_suitable_for: Mapped[str | None] = mapped_column(Text, nullable=True)
    repeatable_patterns: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_status: Mapped[str] = mapped_column(String(40), default="not_started", index=True)
    embedding_keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_vector: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_dimension: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rag_enabled: Mapped[int] = mapped_column(Integer, default=0, index=True)
    callable_by_hotspot: Mapped[int] = mapped_column(Integer, default=0, index=True)
    callable_by_content: Mapped[int] = mapped_column(Integer, default=0, index=True)
    callable_by_campaign: Mapped[int] = mapped_column(Integer, default=0, index=True)
    callable_by_ppt: Mapped[int] = mapped_column(Integer, default=0, index=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("user_accounts.id"), nullable=True, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("user_accounts.id"), nullable=True, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    embedded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_called_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    call_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    feedback_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    related_topics: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recommendations: Mapped[list["TopicRecommendation"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    raw_material: Mapped["CaseRawMaterial | None"] = relationship(back_populates="case")


class CaseRawMaterial(Base):
    __tablename__ = "case_raw_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_type: Mapped[str] = mapped_column(String(40), default="web_link", index=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_title: Mapped[str] = mapped_column(String(255), index=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    processing_status: Mapped[str] = mapped_column(String(40), default="raw", index=True)

    case: Mapped[MarketingCase | None] = relationship(back_populates="raw_material")


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    open_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    union_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(180), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(40), default="viewer", index=True)
    permissions: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_balance: Mapped[int] = mapped_column(Integer, default=1000)
    total_points_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    usage_logs: Mapped[list["AiUsageLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    recommendations: Mapped[list["TopicRecommendation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class TopicRecommendation(Base):
    __tablename__ = "topic_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.id"), index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("marketing_cases.id"), nullable=True, index=True)
    prompt_topic: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)
    points_used: Mapped[int] = mapped_column(Integer, default=0)
    model: Mapped[str] = mapped_column(String(80), default="deepseek-chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount] = relationship(back_populates="recommendations")
    case: Mapped[MarketingCase | None] = relationship(back_populates="recommendations")
    case_refs: Mapped[list["TopicRecommendationCaseRef"]] = relationship(
        back_populates="recommendation", cascade="all, delete-orphan"
    )


class TopicRecommendationCaseRef(Base):
    __tablename__ = "topic_recommendation_case_refs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recommendation_id: Mapped[int] = mapped_column(ForeignKey("topic_recommendations.id"), index=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("marketing_cases.id"), index=True)
    match_score: Mapped[float] = mapped_column(Float, default=0)
    match_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    used_insight: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recommendation: Mapped[TopicRecommendation] = relationship(back_populates="case_refs")
    case: Mapped[MarketingCase] = relationship()


class AiUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user_accounts.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    target_type: Mapped[str] = mapped_column(String(80), index=True)
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    model: Mapped[str] = mapped_column(String(80))
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    points_used: Mapped[int] = mapped_column(Integer, default=0)
    points_charged: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[int] = mapped_column(Integer, default=1, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount | None] = relationship(back_populates="usage_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_secret: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user_accounts.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    resource_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    before_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(80), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount | None] = relationship(back_populates="audit_logs")


class AIActionPricing(Base):
    __tablename__ = "ai_action_pricing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    action_type: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    points_cost: Mapped[int] = mapped_column(Integer, default=0)
    estimated_token_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    enabled: Mapped[int] = mapped_column(Integer, default=1, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
