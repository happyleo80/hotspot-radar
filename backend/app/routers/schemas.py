from datetime import datetime
from pydantic import BaseModel, Field


class MetricOut(BaseModel):
    rank: int | None = None
    heat_score: float | None = None
    view_count: int | None = None
    like_count: int | None = None
    comment_count: int | None = None
    share_count: int | None = None
    favorite_count: int | None = None
    coin_count: int | None = None
    danmaku_count: int | None = None
    collected_at: datetime

    class Config:
        from_attributes = True


class AnalysisOut(BaseModel):
    id: int
    summary: str
    why_it_trends: str
    sentiment: str
    risk_level: str
    marketing_value: str
    suitable_industries: str
    unsuitable_industries: str
    marketing_angles: str
    content_ideas: str
    risk_notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class TopicOut(BaseModel):
    id: int
    platform: str
    source_type: str
    title: str
    normalized_title: str
    rank: int | None = None
    heat_score: float | None = None
    url: str | None = None
    category: str | None = None
    author_name: str | None = None
    content_type: str | None = None
    collected_at: datetime
    first_seen_at: datetime
    last_seen_at: datetime
    analyses: list[AnalysisOut] = []

    class Config:
        from_attributes = True


class TopicDetailOut(TopicOut):
    metrics: list[MetricOut] = []


class ExtensionItem(BaseModel):
    title: str
    url: str | None = None
    rank: int | None = None
    heat_score: float | None = None
    category: str | None = None
    author_name: str | None = None
    content_type: str | None = "visible_dom_item"


class ExtensionCollectIn(BaseModel):
    platform: str
    page_url: str | None = None
    items: list[ExtensionItem] = Field(default_factory=list)
