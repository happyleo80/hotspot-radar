from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import ai, extension, import_export, jobs, topics
from app.services.topic_service import seed_mock_data

settings = get_settings()

app = FastAPI(title="五大平台热点雷达 API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topics.router)
app.include_router(jobs.router)
app.include_router(extension.router)
app.include_router(ai.router)
app.include_router(import_export.router)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_mock_data(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"ok": True, "service": settings.app_name}
