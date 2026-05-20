from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AiUsageLog, TopicRecommendation, UserAccount
from app.routers.schemas import AdminSettingsIn, AdminSettingsOut, AiUsageOut, TopicRecommendationOut, UserAccountOut
from app.services.embedding_service import test_embedding_connection
from app.services.settings_service import admin_settings_payload, set_setting
from app.services.user_service import ROLE_PERMISSIONS, get_or_create_user, permissions_for_user, require_admin, set_user_role_and_permissions, user_from_request

router = APIRouter(prefix="/api/users", tags=["用户与积分"])


class PointsAdjustIn(BaseModel):
    points_delta: int


class UserPermissionUpdateIn(BaseModel):
    role: str
    permissions: list[str] | None = None


class EmbeddingTestIn(BaseModel):
    text: str = "测试向量模型连接"


class FavoriteUpdateIn(BaseModel):
    is_favorite: bool


@router.get("/me", response_model=UserAccountOut)
def my_account(request: Request, db: Session = Depends(get_db)):
    return get_or_create_user(db, user_from_request(request))


@router.get("/me/permissions")
def my_permissions(request: Request, db: Session = Depends(get_db)):
    user = get_or_create_user(db, user_from_request(request))
    return {"role": user.role, "permissions": sorted(permissions_for_user(user))}


@router.get("/me/recommendations", response_model=list[TopicRecommendationOut])
def my_recommendations(request: Request, db: Session = Depends(get_db)):
    user = get_or_create_user(db, user_from_request(request))
    return (
        db.query(TopicRecommendation)
        .filter(TopicRecommendation.user_id == user.id)
        .order_by(desc(TopicRecommendation.created_at))
        .limit(100)
        .all()
    )


@router.patch("/me/recommendations/{recommendation_id}/favorite", response_model=TopicRecommendationOut)
def update_my_recommendation_favorite(
    recommendation_id: int,
    payload: FavoriteUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, user_from_request(request))
    recommendation = (
        db.query(TopicRecommendation)
        .filter(TopicRecommendation.id == recommendation_id, TopicRecommendation.user_id == user.id)
        .first()
    )
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    recommendation.is_favorite = 1 if payload.is_favorite else 0
    db.commit()
    db.refresh(recommendation)
    return recommendation


@router.get("/me/usage", response_model=list[AiUsageOut])
def my_usage(request: Request, db: Session = Depends(get_db)):
    user = get_or_create_user(db, user_from_request(request))
    return (
        db.query(AiUsageLog)
        .filter(AiUsageLog.user_id == user.id)
        .order_by(desc(AiUsageLog.created_at))
        .limit(100)
        .all()
    )


@router.get("/admin/users", response_model=list[UserAccountOut])
def admin_users(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    return db.query(UserAccount).order_by(desc(UserAccount.last_seen_at)).limit(200).all()


@router.post("/admin/users/{user_id}/points", response_model=UserAccountOut)
def adjust_points(user_id: int, payload: PointsAdjustIn, request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    user = db.get(UserAccount, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.points_balance += payload.points_delta
    db.commit()
    db.refresh(user)
    return user


@router.get("/admin/permission-options")
def permission_options(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    return {
        "roles": list(ROLE_PERMISSIONS.keys()),
        "role_permissions": ROLE_PERMISSIONS,
        "permission_labels": {
            "admin_access": "进入管理后台",
            "user_manage": "用户与权限管理",
            "settings_manage": "系统与模型配置",
            "case_view": "查看案例知识库",
            "case_upload": "上传/导入原始案例",
            "case_structure": "触发 AI 结构化",
            "case_edit": "编辑 AI 结构化结果",
            "case_review": "审核案例入库",
            "case_embed": "加入 RAG / 热点策略库",
            "case_delete": "删除案例",
            "tag_manage": "管理标签规则",
        },
    }


@router.patch("/admin/users/{user_id}/permissions", response_model=UserAccountOut)
def update_user_permissions(user_id: int, payload: UserPermissionUpdateIn, request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    user = db.get(UserAccount, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    set_user_role_and_permissions(user, payload.role, payload.permissions)
    db.commit()
    db.refresh(user)
    return user


@router.get("/admin/usage", response_model=list[AiUsageOut])
def admin_usage(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    return db.query(AiUsageLog).order_by(desc(AiUsageLog.created_at)).limit(300).all()


@router.get("/admin/recommendations", response_model=list[TopicRecommendationOut])
def admin_recommendations(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    return db.query(TopicRecommendation).order_by(desc(TopicRecommendation.created_at)).limit(300).all()


@router.get("/admin/settings", response_model=AdminSettingsOut)
def admin_settings(request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    return admin_settings_payload(db)


@router.post("/admin/settings", response_model=AdminSettingsOut)
def update_admin_settings(payload: AdminSettingsIn, request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    if payload.deepseek_api_key is not None and payload.deepseek_api_key.strip():
        set_setting(db, "deepseek_api_key", payload.deepseek_api_key.strip(), is_secret=True)
    if payload.deepseek_base_url is not None and payload.deepseek_base_url.strip():
        set_setting(db, "deepseek_base_url", payload.deepseek_base_url.strip(), is_secret=False)
    if payload.deepseek_model is not None and payload.deepseek_model.strip():
        set_setting(db, "deepseek_model", payload.deepseek_model.strip(), is_secret=False)
    if payload.embedding_provider is not None and payload.embedding_provider.strip():
        set_setting(db, "embedding_provider", payload.embedding_provider.strip(), is_secret=False)
    if payload.embedding_api_key is not None and payload.embedding_api_key.strip():
        set_setting(db, "embedding_api_key", payload.embedding_api_key.strip(), is_secret=True)
    if payload.embedding_base_url is not None and payload.embedding_base_url.strip():
        set_setting(db, "embedding_base_url", payload.embedding_base_url.strip(), is_secret=False)
    if payload.embedding_model is not None and payload.embedding_model.strip():
        set_setting(db, "embedding_model", payload.embedding_model.strip(), is_secret=False)
    if payload.embedding_dimension is not None:
        set_setting(db, "embedding_dimension", str(payload.embedding_dimension), is_secret=False)
    if payload.embedding_enabled is not None:
        set_setting(db, "embedding_enabled", "true" if payload.embedding_enabled else "false", is_secret=False)
    return admin_settings_payload(db)


@router.post("/admin/settings/embedding/test")
def test_embedding_settings(payload: EmbeddingTestIn, request: Request, db: Session = Depends(get_db)):
    require_admin(user_from_request(request), db)
    try:
        return test_embedding_connection(db, payload.text)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
