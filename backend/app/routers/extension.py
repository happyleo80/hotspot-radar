from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.schemas import ExtensionCollectIn
from app.services.topic_service import upsert_topic

router = APIRouter(prefix="/api/extension", tags=["Chrome 插件"])


@router.post("/collect")
def collect_from_extension(payload: ExtensionCollectIn, db: Session = Depends(get_db)):
    count = 0
    for idx, item in enumerate(payload.items, start=1):
        upsert_topic(
            db,
            {
                "platform": payload.platform,
                "source_type": "extension",
                "title": item.title,
                "rank": item.rank or idx,
                "heat_score": item.heat_score,
                "url": item.url or payload.page_url,
                "category": item.category,
                "author_name": item.author_name,
                "content_type": item.content_type,
            },
        )
        count += 1
    db.commit()
    return {"ok": True, "platform": payload.platform, "count": count}
