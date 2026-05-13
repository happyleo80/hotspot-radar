from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.schemas import AnalysisOut
from app.services.ai_service import analyze_topic, generate_brief
from app.services.topic_service import get_topic, list_topics, resonance_topics

router = APIRouter(prefix="/api/ai", tags=["AI 分析"])


@router.post("/analyze/topic/{topic_id}", response_model=AnalysisOut)
def analyze(topic_id: int, db: Session = Depends(get_db)):
    topic = get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return analyze_topic(db, topic)


@router.post("/generate-brief")
def brief(db: Session = Depends(get_db)):
    return {"markdown": generate_brief(db, list_topics(db, limit=50), resonance_topics(db))}
