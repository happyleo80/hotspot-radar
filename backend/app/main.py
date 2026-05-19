from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.database import Base, SessionLocal, engine, ensure_runtime_schema
from app.routers import ai, auth, cases, extension, import_export, jobs, topics, users
from app.services.case_service import import_digitaling_cases
from app.services.auth_service import verify_session
from app.services.topic_service import collect_all, seed_mock_data

settings = get_settings()
scheduler = BackgroundScheduler(timezone="Asia/Shanghai")

app = FastAPI(title="五大平台热点雷达 API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_auth(request: Request, call_next):
    if not settings.auth_required:
        return await call_next(request)
    path = request.url.path
    public_paths = ("/api/auth", "/health", "/docs", "/openapi.json", "/redoc")
    if request.method == "OPTIONS" or not path.startswith("/api/") or path.startswith(public_paths):
        return await call_next(request)
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    try:
        request.state.user = verify_session(authorization.removeprefix("Bearer ").strip())
    except Exception:
        return JSONResponse({"detail": "Invalid or expired session"}, status_code=401)
    return await call_next(request)

app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(jobs.router)
app.include_router(extension.router)
app.include_router(ai.router)
app.include_router(cases.router)
app.include_router(users.router)
app.include_router(import_export.router)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema()
    db = SessionLocal()
    try:
        seed_mock_data(db)
    finally:
        db.close()
    if not scheduler.running:
        if settings.digitaling_daily_import_enabled:
            scheduler.add_job(_daily_import_cases, "cron", hour=4, minute=15, id="daily_digitaling_cases", replace_existing=True)
        scheduler.add_job(
            _refresh_hotspots,
            "interval",
            minutes=max(settings.hotspot_refresh_interval_minutes, 10),
            id="refresh_hotspots",
            replace_existing=True,
        )
        scheduler.start()


@app.on_event("shutdown")
def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


def _daily_import_cases() -> None:
    import asyncio

    db = SessionLocal()
    try:
        asyncio.run(import_digitaling_cases(db, limit=settings.digitaling_import_limit, analyze=True))
    finally:
        db.close()


def _refresh_hotspots() -> None:
    db = SessionLocal()
    try:
        collect_all(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"ok": True, "service": settings.app_name}
