import csv
from io import StringIO

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ai_service import generate_brief
from app.services.topic_service import list_topics, resonance_topics, upsert_topic

router = APIRouter(prefix="/api", tags=["导入导出"])


@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8-sig")
    rows = csv.DictReader(StringIO(content))
    count = 0
    for row in rows:
        if not row.get("title") or not row.get("platform"):
            continue
        upsert_topic(
            db,
            {
                "platform": row["platform"],
                "source_type": "manual",
                "title": row["title"],
                "rank": int(row["rank"]) if row.get("rank") else None,
                "heat_score": float(row["heat_score"]) if row.get("heat_score") else None,
                "url": row.get("url"),
                "category": row.get("category"),
            },
        )
        count += 1
    db.commit()
    return {"ok": True, "count": count}


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "platform", "title", "rank", "heat_score", "url", "category"])
    for topic in list_topics(db, limit=100):
        writer.writerow([topic.id, topic.platform, topic.title, topic.rank, topic.heat_score, topic.url, topic.category])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=topics.csv"})


@router.get("/export/excel")
def export_excel(db: Session = Depends(get_db)):
    return export_csv(db)


@router.get("/export/markdown", response_class=PlainTextResponse)
def export_markdown(db: Session = Depends(get_db)):
    return generate_brief(db, list_topics(db, limit=50), resonance_topics(db))
