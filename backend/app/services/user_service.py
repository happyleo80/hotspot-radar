from datetime import datetime

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import UserAccount


ROLE_PERMISSIONS = {
    "viewer": ["case_view"],
    "analyst": ["case_view"],
    "contributor": ["case_view", "case_upload"],
    "reviewer": ["case_view", "case_upload", "case_structure", "case_edit", "case_review", "case_embed", "tag_manage"],
    "admin": [
        "admin_access",
        "case_view",
        "case_upload",
        "case_structure",
        "case_edit",
        "case_review",
        "case_embed",
        "tag_manage",
        "settings_manage",
        "user_manage",
    ],
    "super_admin": [
        "admin_access",
        "case_view",
        "case_upload",
        "case_structure",
        "case_edit",
        "case_review",
        "case_embed",
        "case_delete",
        "tag_manage",
        "settings_manage",
        "user_manage",
    ],
}


def user_from_request(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user and not get_settings().auth_required:
        return {"open_id": "dev", "union_id": "dev", "name": "开发模式", "email": None}
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def get_or_create_user(db: Session, user_payload: dict) -> UserAccount:
    open_id = user_payload.get("open_id") or user_payload.get("union_id")
    if not open_id:
        raise HTTPException(status_code=401, detail="Invalid user identity")

    user = db.query(UserAccount).filter(UserAccount.open_id == open_id).first()
    now = datetime.utcnow()
    admin_ids = _admin_ids()
    is_env_admin = open_id in admin_ids or user_payload.get("union_id") in admin_ids
    is_first_user = db.query(UserAccount).count() == 0
    default_role = "super_admin" if (not get_settings().auth_required) or is_env_admin or (is_first_user and not admin_ids) else "viewer"

    if user is None:
        user = UserAccount(
            open_id=open_id,
            union_id=user_payload.get("union_id"),
            name=user_payload.get("name") or "飞书用户",
            email=user_payload.get("email"),
            avatar_url=user_payload.get("avatar_url"),
            role=default_role,
            permissions=",".join(ROLE_PERMISSIONS[default_role]),
            points_balance=1000,
            created_at=now,
            last_seen_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    user.union_id = user_payload.get("union_id") or user.union_id
    user.name = user_payload.get("name") or user.name
    user.email = user_payload.get("email") or user.email
    user.avatar_url = user_payload.get("avatar_url") or user.avatar_url
    if (not get_settings().auth_required or is_env_admin) and user.role not in {"admin", "super_admin"}:
        user.role = "super_admin"
        user.permissions = ",".join(ROLE_PERMISSIONS["super_admin"])
    if not user.role:
        user.role = "viewer"
    user.last_seen_at = now
    db.commit()
    db.refresh(user)
    return user


def permissions_for_user(user: UserAccount) -> set[str]:
    role = user.role or "viewer"
    permissions = set(ROLE_PERMISSIONS.get(role, []))
    permissions.update(item.strip() for item in (user.permissions or "").split(",") if item.strip())
    return permissions


def has_permission(user: UserAccount, permission: str) -> bool:
    if user.role == "super_admin":
        return True
    return permission in permissions_for_user(user)


def require_permission(db: Session, user_payload: dict, permission: str) -> UserAccount:
    user = get_or_create_user(db, user_payload)
    if not has_permission(user, permission):
        raise HTTPException(status_code=403, detail=f"Permission required: {permission}")
    return user


def require_admin(user_payload: dict, db: Session | None = None) -> None:
    if db is not None:
        user = get_or_create_user(db, user_payload)
        if has_permission(user, "admin_access") or has_permission(user, "user_manage"):
            return
    admin_ids = _admin_ids()
    if not admin_ids and not get_settings().auth_required:
        return
    if user_payload.get("open_id") not in admin_ids and user_payload.get("union_id") not in admin_ids:
        raise HTTPException(status_code=403, detail="Admin permission required")


def set_user_role_and_permissions(user: UserAccount, role: str, permissions: list[str] | None = None) -> UserAccount:
    if role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = role
    merged = list(dict.fromkeys((permissions or ROLE_PERMISSIONS[role])))
    user.permissions = ",".join(merged)
    return user


def _admin_ids() -> set[str]:
    settings = get_settings()
    return {item.strip() for item in settings.admin_open_ids.split(",") if item.strip()}
