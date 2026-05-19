from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import topic_service
from app.services.user_service import require_admin, user_from_request

router = APIRouter(prefix="/api/jobs", tags=["数据采集"])


@router.post("/collect")
def collect_all(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request))
    return topic_service.collect_all(db)


@router.post("/collect/{platform}")
def collect_platform(platform: str, request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request))
    try:
        return topic_service.collect_platform(db, platform)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
