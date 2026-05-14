import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException

from app.config import get_settings


FEISHU_AUTH_URL = "https://open.feishu.cn/open-apis/authen/v1/index"
FEISHU_APP_TOKEN_URL = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
FEISHU_USER_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v1/access_token"
FEISHU_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info"


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload: dict, expires_in: int) -> str:
    settings = get_settings()
    body = {**payload, "exp": int(time.time()) + expires_in}
    encoded = _b64encode(json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = hmac.new(settings.auth_session_secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded}.{_b64encode(signature)}"


def _verify(token: str) -> dict:
    settings = get_settings()
    try:
        encoded, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc
    expected = hmac.new(settings.auth_session_secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    actual = _b64decode(signature)
    if not hmac.compare_digest(expected, actual):
        raise HTTPException(status_code=401, detail="Invalid auth token")
    payload = json.loads(_b64decode(encoded))
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Auth token expired")
    return payload


def create_state(frontend_redirect: str | None = None) -> str:
    settings = get_settings()
    return _sign(
        {
            "nonce": secrets.token_urlsafe(16),
            "frontend_redirect": frontend_redirect or settings.frontend_url,
        },
        expires_in=600,
    )


def verify_state(state: str) -> dict:
    return _verify(state)


def create_session(user: dict) -> str:
    return _sign({"user": user}, expires_in=7 * 24 * 60 * 60)


def verify_session(token: str) -> dict:
    return _verify(token).get("user") or {}


def build_feishu_login_url(state: str) -> str:
    settings = get_settings()
    if not settings.feishu_app_id or not settings.feishu_redirect_uri:
        raise HTTPException(status_code=503, detail="Feishu login is not configured")
    query = urlencode(
        {
            "app_id": settings.feishu_app_id,
            "redirect_uri": settings.feishu_redirect_uri,
            "state": state,
        }
    )
    return f"{FEISHU_AUTH_URL}?{query}"


async def exchange_feishu_code(code: str) -> dict:
    settings = get_settings()
    if not settings.feishu_app_id or not settings.feishu_app_secret:
        raise HTTPException(status_code=503, detail="Feishu login is not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        app_token_response = await client.post(
            FEISHU_APP_TOKEN_URL,
            json={"app_id": settings.feishu_app_id, "app_secret": settings.feishu_app_secret},
        )
        app_token_response.raise_for_status()
        app_token_payload = app_token_response.json()
        if app_token_payload.get("code") != 0:
            raise HTTPException(status_code=502, detail=f"Feishu app token error: {app_token_payload.get('msg')}")
        app_access_token = app_token_payload["app_access_token"]

        user_token_response = await client.post(
            FEISHU_USER_TOKEN_URL,
            headers={"Authorization": f"Bearer {app_access_token}"},
            json={"grant_type": "authorization_code", "code": code},
        )
        user_token_response.raise_for_status()
        user_token_payload = user_token_response.json()
        if user_token_payload.get("code") != 0:
            raise HTTPException(status_code=502, detail=f"Feishu user token error: {user_token_payload.get('msg')}")
        user_access_token = user_token_payload["data"]["access_token"]

        user_info_response = await client.get(
            FEISHU_USER_INFO_URL,
            headers={"Authorization": f"Bearer {user_access_token}"},
        )
        user_info_response.raise_for_status()
        user_info_payload = user_info_response.json()
        if user_info_payload.get("code") != 0:
            raise HTTPException(status_code=502, detail=f"Feishu user info error: {user_info_payload.get('msg')}")
        data = user_info_payload["data"]
        return {
            "open_id": data.get("open_id"),
            "union_id": data.get("union_id"),
            "name": data.get("name") or data.get("en_name") or "飞书用户",
            "avatar_url": data.get("avatar_url"),
            "email": data.get("email"),
        }
