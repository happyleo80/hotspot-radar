from urllib.parse import urlencode

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.services.auth_service import (
    build_feishu_login_url,
    create_session,
    create_state,
    exchange_feishu_code,
    verify_session,
    verify_state,
)

router = APIRouter(prefix="/api/auth", tags=["登录认证"])


@router.get("/config")
def auth_config():
    settings = get_settings()
    return {
        "auth_required": settings.auth_required,
        "feishu_configured": bool(settings.feishu_app_id and settings.feishu_app_secret and settings.feishu_redirect_uri),
    }


@router.get("/login-url")
def login_url(frontend_redirect: str | None = None):
    state = create_state(frontend_redirect)
    return {"url": build_feishu_login_url(state)}


@router.get("/feishu/callback")
async def feishu_callback(code: str = Query(...), state: str = Query(...)):
    state_payload = verify_state(state)
    user = await exchange_feishu_code(code)
    session_token = create_session(user)
    frontend_redirect = state_payload.get("frontend_redirect") or get_settings().frontend_url
    separator = "&" if "?" in frontend_redirect else "?"
    query = urlencode({"auth_token": session_token})
    return RedirectResponse(f"{frontend_redirect}{separator}{query}")


@router.get("/me")
def me(authorization: str | None = Header(default=None)):
    settings = get_settings()
    if not settings.auth_required:
        return {"authenticated": True, "user": {"name": "开发模式", "open_id": "dev"}}
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = verify_session(authorization.removeprefix("Bearer ").strip())
    return {"authenticated": True, "user": user}
