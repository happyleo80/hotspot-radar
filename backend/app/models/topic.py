from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("platform", "normalized_title", name="uq_platform_title"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    source_type: Mapped[str] = mapped_column(String(32), default="mock")
    title: Mapped[str] = mapped_column(String(255), index=True)
    normalized_title: Mapped[str] = mapped_column(String(255), index=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heat_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    metrics: Mapped[list["TopicMetric"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan", order_by="TopicMetric.collected_at"
    )
    analyses: Mapped[list["TopicAIAnalysis"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan", order_by="TopicAIAnalysis.created_at"
    )


class TopicMetric(Base):
    __tablename__ = "topic_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heat_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    share_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    favorite_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    coin_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    danmaku_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic: Mapped[Topic] = relationship(back_populates="metrics")


class TopicAIAnalysis(Base):
    __tablename__ = "topic_ai_analysis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    summary: Mapped[str] = mapped_column(Text)
    why_it_trends: Mapped[str] = mapped_column(Text)
    sentiment: Mapped[str] = mapped_column(String(40))
    risk_level: Mapped[str] = mapped_column(String(40), index=True)
    marketing_value: Mapped[str] = mapped_column(String(40), index=True)
    suitable_industries: Mapped[str] = mapped_column(Text)
    unsuitable_industries: Mapped[str] = mapped_column(Text)
    marketing_angles: Mapped[str] = mapped_column(Text)
    content_ideas: Mapped[str] = mapped_column(Text)
    risk_notes: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic: Mapped[Topic] = relationship(back_populates="analyses")
