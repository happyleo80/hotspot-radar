from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import topic_service

router = APIRouter(prefix="/api/jobs", tags=["数据采集"])


@router.post("/collect")
def collect_all(db: Session = Depends(get_db)):
    return topic_service.collect_all(db)


@router.post("/collect/{platform}")
def collect_platform(platform: str, db: Session = Depends(get_db)):
    try:
        return topic_service.collect_platform(db, platform)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
