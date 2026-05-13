from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.schemas import TopicDetailOut, TopicOut
from app.services import topic_service

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
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = topic_service.get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic
