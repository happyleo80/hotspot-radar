from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.schemas import AnalysisOut, TopicRecommendationOut
from app.services.case_service import recommend_for_topic
from app.services.ai_service import analyze_topic, generate_brief
from app.services.topic_service import get_topic, list_topics, resonance_topics, topic_stats
from app.services.user_service import get_or_create_user, user_from_request

router = APIRouter(prefix="/api/ai", tags=["AI 分析"])


@router.post("/analyze/topic/{topic_id}", response_model=AnalysisOut)
def analyze(topic_id: int, db: Session = Depends(get_db)):
    topic = get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return analyze_topic(db, topic)


@router.post("/recommend/topic/{topic_id}", response_model=TopicRecommendationOut)
async def recommend(topic_id: int, request: Request, db: Session = Depends(get_db)):
    topic = get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    user = get_or_create_user(db, user_from_request(request))
    try:
        return await recommend_for_topic(db, topic, user)
    except ValueError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc


@router.post("/generate-brief")
def brief(db: Session = Depends(get_db)):
    stats = topic_stats(db)
    return {"markdown": generate_brief(db, list_topics(db, limit=50), resonance_topics(db), observed_total=stats["total"])}
