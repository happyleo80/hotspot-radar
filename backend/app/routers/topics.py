from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TopicRecommendation
from app.routers.schemas import TopicDetailOut, TopicOut
from app.services import topic_service
from app.services.user_service import get_or_create_user

router = APIRouter(prefix="/api/topics", tags=["热点数据"])


@router.get("", response_model=list[TopicOut])
def get_topics(platform: str | None = None, limit: int = Query(50, le=100), db: Session = Depends(get_db)):
    return topic_service.list_topics(db, platform, limit)


@router.get("/rising", response_model=list[TopicOut])
def get_rising(db: Session = Depends(get_db)):
    return topic_service.rising_topics(db)


@router.get("/high-value", response_model=list[TopicOut])
def get_high_value(db: Session = Depends(get_db)):
    return topic_service.high_value_topics(db)


@router.get("/high-risk", response_model=list[TopicOut])
def get_high_risk(db: Session = Depends(get_db)):
    return topic_service.high_risk_topics(db)


@router.get("/resonance")
def get_resonance(db: Session = Depends(get_db)):
    return topic_service.resonance_topics(db)


@router.get("/platform/{platform}", response_model=list[TopicOut])
def get_platform_topics(platform: str, db: Session = Depends(get_db)):
    return topic_service.list_topics(db, platform, 50)


@router.get("/{topic_id}", response_model=TopicDetailOut)
def get_topic(topic_id: int, request: Request, db: Session = Depends(get_db)):
    topic = topic_service.get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    latest_recommendation = None
    user_payload = getattr(request.state, "user", None)
    if user_payload:
        user = get_or_create_user(db, user_payload)
        latest_recommendation = (
            db.query(TopicRecommendation)
            .filter(TopicRecommendation.user_id == user.id, TopicRecommendation.topic_id == topic.id)
            .order_by(desc(TopicRecommendation.created_at))
            .first()
        )
    return {
        "id": topic.id,
        "platform": topic.platform,
        "source_type": topic.source_type,
        "title": topic.title,
        "normalized_title": topic.normalized_title,
        "rank": topic.rank,
        "heat_score": topic.heat_score,
        "url": topic.url,
        "category": topic.category,
        "author_name": topic.author_name,
        "content_type": topic.content_type,
        "collected_at": topic.collected_at,
        "first_seen_at": topic.first_seen_at,
        "last_seen_at": topic.last_seen_at,
        "analyses": topic.analyses,
        "metrics": topic.metrics,
        "latest_recommendation": latest_recommendation,
    }
