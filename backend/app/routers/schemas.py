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


class TopicRecommendationCaseRefOut(BaseModel):
    id: int
    recommendation_id: int
    case_id: int
    match_score: float
    match_reason: str | None = None
    used_insight: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TopicRecommendationOut(BaseModel):
    id: int
    user_id: int
    topic_id: int
    case_id: int | None = None
    prompt_topic: str
    recommendation: str
    points_used: int
    model: str
    created_at: datetime
    case_refs: list[TopicRecommendationCaseRefOut] = []

    class Config:
        from_attributes = True


class TopicDetailOut(TopicOut):
    metrics: list[MetricOut] = []
    latest_recommendation: TopicRecommendationOut | None = None


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


class MarketingCaseOut(BaseModel):
    id: int
    source: str
    source_url: str
    source_title: str | None = None
    title: str
    summary: str | None = None
    brand: str | None = None
    industry: str | None = None
    published_at: datetime | None = None
    fetched_at: datetime
    analyzed_at: datetime | None = None
    creativity: str | None = None
    target_audience: str | None = None
    execution_highlights: str | None = None
    communication_effect: str | None = None
    reusable_methods: str | None = None
    tags: str | None = None
    raw_text: str | None = None
    raw_material_id: int | None = None
    source_category: str = "crawled"
    platform: str | None = None
    pipeline_stage: str = "raw"
    structure_status: str = "pending"
    review_status: str = "pending"
    reference_value: str = "medium"
    knowledge_score: int = 0
    structured_json: str | None = None
    ai_core_insight: str | None = None
    why_it_worked: str | None = None
    strategy_patterns: str | None = None
    emotional_mechanisms: str | None = None
    marketing_model: str | None = None
    marketing_model_definition: str | None = None
    marketing_model_confidence: float | None = None
    sub_models: str | None = None
    user_psychology_insights: str | None = None
    content_structure_model: str | None = None
    reusable_strategy_template: str | None = None
    knowledge_level: str | None = None
    suitable_industries: str | None = None
    unsuitable_industries: str | None = None
    platform_strategy: str | None = None
    industry_tags: str | None = None
    platform_tags: str | None = None
    strategy_tags: str | None = None
    emotion_tags: str | None = None
    risk_points: str | None = None
    suitable_for: str | None = None
    not_suitable_for: str | None = None
    repeatable_patterns: str | None = None
    embedding_status: str = "not_started"
    embedding_keywords: str | None = None
    embedding_error: str | None = None
    embedding_dimension: int | None = None
    rag_enabled: int = 0
    callable_by_hotspot: int = 0
    callable_by_content: int = 0
    callable_by_campaign: int = 0
    callable_by_ppt: int = 0
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    approved_by: int | None = None
    approved_at: datetime | None = None
    embedded_at: datetime | None = None
    last_called_at: datetime | None = None
    call_count: int = 0
    feedback_score: float | None = None
    related_topics: str | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CaseRawMaterialOut(BaseModel):
    id: int
    source_type: str
    source_url: str | None = None
    raw_title: str
    raw_text: str | None = None
    file_url: str | None = None
    created_at: datetime
    processing_status: str

    class Config:
        from_attributes = True


class CaseRawMaterialIn(BaseModel):
    source_type: str = "markdown"
    source_url: str | None = None
    raw_title: str
    raw_text: str | None = None
    file_url: str | None = None


class CaseUpdateIn(BaseModel):
    title: str | None = None
    brand: str | None = None
    industry: str | None = None
    platform: str | None = None
    source_category: str | None = None
    pipeline_stage: str | None = None
    structure_status: str | None = None
    review_status: str | None = None
    reference_value: str | None = None
    knowledge_score: int | None = None
    structured_json: str | None = None
    ai_core_insight: str | None = None
    why_it_worked: str | None = None
    strategy_patterns: str | None = None
    emotional_mechanisms: str | None = None
    marketing_model: str | None = None
    marketing_model_definition: str | None = None
    marketing_model_confidence: float | None = None
    sub_models: str | None = None
    user_psychology_insights: str | None = None
    content_structure_model: str | None = None
    reusable_strategy_template: str | None = None
    knowledge_level: str | None = None
    suitable_industries: str | None = None
    unsuitable_industries: str | None = None
    platform_strategy: str | None = None
    industry_tags: str | None = None
    platform_tags: str | None = None
    strategy_tags: str | None = None
    emotion_tags: str | None = None
    risk_points: str | None = None
    suitable_for: str | None = None
    not_suitable_for: str | None = None
    repeatable_patterns: str | None = None
    rag_enabled: int | None = None
    callable_by_hotspot: int | None = None
    callable_by_content: int | None = None
    callable_by_campaign: int | None = None
    callable_by_ppt: int | None = None
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    approved_by: int | None = None
    approved_at: datetime | None = None
    embedded_at: datetime | None = None
    last_called_at: datetime | None = None
    call_count: int | None = None
    feedback_score: float | None = None
    related_topics: str | None = None


class SimilarCaseOut(BaseModel):
    case: MarketingCaseOut
    score: float
    reasons: list[str] = []


class RelatedTopicOut(BaseModel):
    id: int
    title: str
    platform: str
    score: float
    reasons: list[str] = []


class RagSearchOut(BaseModel):
    topic_id: int
    topic_title: str
    matches: list[SimilarCaseOut] = []


class CaseImportOut(BaseModel):
    fetched: int
    created: int
    updated: int
    analyzed: int


class UserAccountOut(BaseModel):
    id: int
    open_id: str
    union_id: str | None = None
    name: str
    email: str | None = None
    avatar_url: str | None = None
    role: str = "viewer"
    permissions: str | None = None
    points_balance: int
    total_points_used: int
    created_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


class AiUsageOut(BaseModel):
    id: int
    user_id: int | None = None
    action: str
    target_type: str
    target_id: int | None = None
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    points_used: int
    points_charged: int | None = None
    cost_estimate: float | None = None
    duration_ms: int | None = None
    success: int = 1
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminSettingsOut(BaseModel):
    deepseek_api_key_configured: bool
    deepseek_api_key_masked: str
    deepseek_base_url: str
    deepseek_model: str
    embedding_provider: str = "mock"
    embedding_api_key_configured: bool = False
    embedding_api_key_masked: str = ""
    embedding_base_url: str = ""
    embedding_model: str = "embedding-3"
    embedding_dimension: int = 1024
    embedding_enabled: bool = False


class AdminSettingsIn(BaseModel):
    deepseek_api_key: str | None = None
    deepseek_base_url: str | None = None
    deepseek_model: str | None = None
    embedding_provider: str | None = None
    embedding_api_key: str | None = None
    embedding_base_url: str | None = None
    embedding_model: str | None = None
    embedding_dimension: int | None = None
    embedding_enabled: bool | None = None
