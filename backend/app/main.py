from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import ai, auth, extension, import_export, jobs, topics
from app.services.auth_service import verify_session
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
