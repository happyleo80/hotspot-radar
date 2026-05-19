from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.schemas import CaseImportOut, CaseRawMaterialIn, CaseRawMaterialOut, CaseUpdateIn, MarketingCaseOut, RagSearchOut, RelatedTopicOut, SimilarCaseOut
from app.services.case_service import (
    approve_case,
    cleanup_case_library,
    create_raw_material,
    embed_all_cases,
    embed_case,
    get_case,
    import_digitaling_cases,
    list_cases,
    list_raw_materials,
    related_topics_for_case,
    return_case_for_rerun,
    search_cases_for_topic,
    similar_cases,
    structure_case,
    update_case,
)
from app.services.topic_service import get_topic
from app.services.user_service import require_permission, user_from_request

router = APIRouter(prefix="/api/cases", tags=["营销案例知识库"])


@router.get("", response_model=list[MarketingCaseOut])
def cases(request: Request, limit: int = Query(100, le=200), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    return list_cases(db, limit)


@router.get("/raw-materials", response_model=list[CaseRawMaterialOut])
def raw_materials(request: Request, limit: int = Query(100, le=200), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    return list_raw_materials(db, limit)


@router.post("/raw-materials", response_model=CaseRawMaterialOut)
def add_raw_material(payload: CaseRawMaterialIn, request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_upload")
    return create_raw_material(db, payload)


@router.post("/import-digitaling", response_model=CaseImportOut)
async def import_cases(request: Request, limit: int = Query(100, le=100), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_upload")
    return await import_digitaling_cases(db, limit=limit, analyze=True)


@router.post("/cleanup")
def cleanup_cases(request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_delete")
    return cleanup_case_library(db)


@router.get("/rag/search", response_model=RagSearchOut)
def rag_search(topic_id: int, request: Request, limit: int = Query(5, le=20), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    topic = get_topic(db, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"topic_id": topic.id, "topic_title": topic.title, "matches": search_cases_for_topic(db, topic, limit)}


@router.post("/embed-all")
def embed_all(request: Request, db: Session = Depends(get_db)):
    user = require_permission(db, user_from_request(request), "case_embed")
    return embed_all_cases(db, user)


@router.get("/{case_id}", response_model=MarketingCaseOut)
def case_detail(case_id: int, request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.patch("/{case_id}", response_model=MarketingCaseOut)
def save_case(case_id: int, payload: CaseUpdateIn, request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_edit")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return update_case(db, case, payload)


@router.post("/{case_id}/structure", response_model=MarketingCaseOut)
async def structure(case_id: int, request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_structure")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await structure_case(db, case)


@router.post("/{case_id}/approve", response_model=MarketingCaseOut)
def approve(case_id: int, request: Request, db: Session = Depends(get_db)):
    user = require_permission(db, user_from_request(request), "case_review")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return approve_case(db, case, user)


@router.post("/{case_id}/rerun", response_model=MarketingCaseOut)
def rerun(case_id: int, request: Request, db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_structure")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return return_case_for_rerun(db, case)


@router.post("/{case_id}/embed", response_model=MarketingCaseOut)
def embed(case_id: int, request: Request, db: Session = Depends(get_db)):
    user = require_permission(db, user_from_request(request), "case_embed")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return embed_case(db, case, user)


@router.get("/{case_id}/similar", response_model=list[SimilarCaseOut])
def similar(case_id: int, request: Request, limit: int = Query(6, le=20), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return similar_cases(db, case, limit)


@router.get("/{case_id}/related-topics", response_model=list[RelatedTopicOut])
def related_topics(case_id: int, request: Request, limit: int = Query(8, le=20), db: Session = Depends(get_db)):
    require_permission(db, user_from_request(request), "case_view")
    case = get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return related_topics_for_case(db, case, limit)
