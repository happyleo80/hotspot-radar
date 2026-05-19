from datetime import datetime
from email.utils import parsedate_to_datetime
import json
import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AiUsageLog, CaseRawMaterial, MarketingCase, Topic, TopicRecommendation, TopicRecommendationCaseRef, UserAccount
from app.services.deepseek_service import deepseek_json
from app.services.embedding_service import embed_text

DIGITALING_ARTICLES_URL = "https://www.digitaling.com/articles"
DIGITALING_LIST_URLS = [
    DIGITALING_ARTICLES_URL,
    "https://www.digitaling.com/articles/choice",
    "https://www.digitaling.com/articles/headline",
    "https://www.digitaling.com/search/articles/?kw=%E8%90%A5%E9%94%80",
    "https://www.digitaling.com/search/articles/?kw=%E5%88%9B%E6%84%8F",
    "https://www.digitaling.com/search/articles/?kw=%E7%83%AD%E7%82%B9",
    "https://www.digitaling.com/search/articles/?kw=%E4%BA%8B%E4%BB%B6%E8%90%A5%E9%94%80",
]
USER_AGENT = "TrustwinHotspotRadar/0.1 (+marketing-case-research; contact: local)"


def list_cases(db: Session, limit: int = 100) -> list[MarketingCase]:
    cleanup_case_library(db)
    _backfill_case_pipeline(db)
    return db.query(MarketingCase).order_by(desc(MarketingCase.updated_at), desc(MarketingCase.id)).limit(limit).all()


def get_case(db: Session, case_id: int) -> MarketingCase | None:
    cleanup_case_library(db)
    _backfill_case_pipeline(db)
    return db.query(MarketingCase).filter(MarketingCase.id == case_id).first()


def cleanup_case_library(db: Session) -> dict:
    cases = db.query(MarketingCase).all()
    delete_ids: set[int] = set()
    delete_raw_ids: list[int] = []
    by_title: dict[str, list[MarketingCase]] = {}
    for case in cases:
        by_title.setdefault(_normalized_case_title(case.title), []).append(case)

    for group in by_title.values():
        if len(group) <= 1:
            continue
        keeper = max(group, key=_case_keep_score)
        for case in group:
            if case.id != keeper.id:
                delete_ids.add(case.id)

    for case in cases:
        if case.id in delete_ids:
            continue
        if _is_low_value_case_title(case.title):
            delete_ids.add(case.id)

    if not delete_ids:
        return {"deleted": 0}

    deleting = db.query(MarketingCase).filter(MarketingCase.id.in_(delete_ids)).all()
    for case_id in delete_ids:
        db.query(TopicRecommendation).filter(TopicRecommendation.case_id == case_id).update({TopicRecommendation.case_id: None})
    for case in deleting:
        if case.raw_material_id:
            delete_raw_ids.append(case.raw_material_id)
        db.delete(case)
    db.flush()
    for raw_id in delete_raw_ids:
        still_used = db.query(MarketingCase).filter(MarketingCase.raw_material_id == raw_id).first()
        if not still_used:
            raw = db.query(CaseRawMaterial).filter(CaseRawMaterial.id == raw_id).first()
            if raw:
                db.delete(raw)
    db.commit()
    return {"deleted": len(delete_ids)}


def list_raw_materials(db: Session, limit: int = 100) -> list[CaseRawMaterial]:
    _ensure_raw_materials(db)
    return db.query(CaseRawMaterial).order_by(desc(CaseRawMaterial.created_at)).limit(limit).all()


def create_raw_material(db: Session, payload) -> CaseRawMaterial:
    raw = CaseRawMaterial(
        source_type=payload.source_type,
        source_url=payload.source_url,
        raw_title=payload.raw_title,
        raw_text=payload.raw_text,
        file_url=payload.file_url,
        processing_status="raw",
    )
    db.add(raw)
    db.commit()
    db.refresh(raw)
    return raw


def update_case(db: Session, case: MarketingCase, payload) -> MarketingCase:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    case.updated_at = datetime.utcnow()
    if case.knowledge_score >= 80:
        case.reference_value = "high"
    case.knowledge_level = case.knowledge_level or _knowledge_level(case)
    db.commit()
    db.refresh(case)
    return case


async def structure_case(db: Session, case: MarketingCase) -> MarketingCase:
    fallback = _structured_fallback(case)
    data, usage = await deepseek_json(
        "你是品牌营销案例知识工程师。请把原始案例拆解成可检索、可复用的知识资产。只输出 JSON。",
        "\n".join(
            [
                "请输出字段：case_name, brand, industry, platforms, campaign_goal, target_audience, core_insight, marketing_model, marketing_model_definition, sub_models, user_psychology_insights, content_structure_model, reusable_strategy_template, emotional_trigger, content_strategy, visual_style, platform_strategy, why_it_worked, repeatable_patterns, risk_points, suitable_for, not_suitable_for, reference_value, knowledge_level。",
                "knowledge_level 可选：S级案例、A级案例、高复用案例、高行业参考价值、热点高适配。",
                "reusable_strategy_template 输出对象，包含 template_name, suitable_scenarios, core_flow, platform_adaptation, callable_systems。",
                f"案例标题：{case.title}",
                f"摘要：{case.summary or ''}",
                f"正文：{(case.raw_text or '')[:5000]}",
            ]
        ),
        fallback,
    )
    _apply_structured_data(case, data)
    case.pipeline_stage = "ai_structured"
    case.structure_status = "ai_structured"
    case.review_status = "pending"
    case.analyzed_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    case.knowledge_score = calculate_knowledge_score(case)
    case.knowledge_level = _knowledge_level(case)
    if case.raw_material:
        case.raw_material.processing_status = "ai_structured"
    db.add(
        AiUsageLog(
            action="structure_case",
            target_type="marketing_case",
            target_id=case.id,
            model=usage.get("model") or get_settings().deepseek_model,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            points_used=0,
        )
    )
    db.commit()
    db.refresh(case)
    return case


def approve_case(db: Session, case: MarketingCase, user: UserAccount | None = None) -> MarketingCase:
    case.pipeline_stage = "active"
    case.structure_status = "human_reviewed"
    case.review_status = "approved"
    case.embedding_status = "queued"
    case.rag_enabled = 1
    case.callable_by_hotspot = 1
    case.reviewed_by = user.id if user else case.reviewed_by
    case.reviewed_at = datetime.utcnow()
    case.approved_by = user.id if user else case.approved_by
    case.approved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    if case.raw_material:
        case.raw_material.processing_status = "approved"
    db.commit()
    db.refresh(case)
    return case


def embed_case(db: Session, case: MarketingCase, user: UserAccount | None = None) -> MarketingCase:
    case.embedding_keywords = _case_embedding_keywords(case)
    case.knowledge_level = case.knowledge_level or _knowledge_level(case)
    try:
        vector, meta = embed_text(db, _case_embedding_text(case))
        case.embedding_vector = json.dumps(vector)
        case.embedding_dimension = int(meta.get("dimension") or len(vector))
        case.embedding_status = "embedded"
        case.embedding_error = None
    except Exception as exc:
        case.embedding_status = "failed"
        case.embedding_error = str(exc)[:1000]
        db.commit()
        db.refresh(case)
        return case
    case.rag_enabled = 1
    case.callable_by_hotspot = 1
    case.pipeline_stage = "active"
    case.embedded_at = datetime.utcnow()
    if user and not case.approved_by:
        case.approved_by = user.id
        case.approved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return case


def embed_all_cases(db: Session, user: UserAccount | None = None, limit: int = 300) -> dict:
    rows = (
        db.query(MarketingCase)
        .filter(
            or_(
                MarketingCase.review_status == "approved",
                MarketingCase.reference_value == "high",
                MarketingCase.callable_by_hotspot == 1,
                MarketingCase.knowledge_score >= 80,
            )
        )
        .limit(limit)
        .all()
    )
    result = {"total": len(rows), "embedded": 0, "failed": 0}
    for case in rows:
        updated = embed_case(db, case, user)
        if updated.embedding_status == "embedded":
            result["embedded"] += 1
        else:
            result["failed"] += 1
    return result


def return_case_for_rerun(db: Session, case: MarketingCase) -> MarketingCase:
    case.pipeline_stage = "raw"
    case.structure_status = "needs_rerun"
    case.review_status = "returned"
    case.updated_at = datetime.utcnow()
    if case.raw_material:
        case.raw_material.processing_status = "needs_rerun"
    db.commit()
    db.refresh(case)
    return case


def search_relevant_cases(db: Session, topic: Topic, limit: int = 5) -> list[MarketingCase]:
    rows = search_cases_for_topic(db, topic, limit)
    if rows:
        return [item["case"] for item in rows]
    return db.query(MarketingCase).filter(MarketingCase.rag_enabled == 1).order_by(desc(MarketingCase.knowledge_score)).limit(limit).all()


def search_cases_for_topic(db: Session, topic: Topic, limit: int = 5) -> list[dict]:
    topic_keywords = _topic_keywords(topic.title)
    topic_text = " ".join([topic.title or "", topic.platform or "", topic.category or "", topic.content_type or ""])
    candidates = (
        db.query(MarketingCase)
        .filter(MarketingCase.rag_enabled == 1)
        .order_by(desc(MarketingCase.knowledge_score), desc(MarketingCase.updated_at))
        .limit(300)
        .all()
    )
    if not candidates:
        candidates = (
            db.query(MarketingCase)
            .order_by(desc(MarketingCase.knowledge_score), desc(MarketingCase.updated_at))
            .limit(300)
            .all()
        )
    scored = [_score_case_match(case, topic_keywords, topic_text, topic.platform) for case in candidates]
    matches = [item for item in sorted(scored, key=lambda row: row["score"], reverse=True) if item["score"] > 0][:limit]
    if matches:
        return matches
    fallback = sorted(scored, key=lambda row: row["score"], reverse=True)[:limit]
    for row in fallback:
        if not row["reasons"]:
            row["reasons"] = ["高分知识资产兜底召回"]
    return fallback


def similar_cases(db: Session, case: MarketingCase, limit: int = 6) -> list[dict]:
    base_keywords = set(_split_tags(case.embedding_keywords or _case_embedding_keywords(case)))
    base_tags = set(_split_tags("、".join([case.industry_tags or "", case.platform_tags or "", case.strategy_tags or "", case.emotion_tags or ""])))
    candidates = db.query(MarketingCase).filter(MarketingCase.id != case.id).limit(300).all()
    rows = []
    for candidate in candidates:
        candidate_keywords = set(_split_tags(candidate.embedding_keywords or _case_embedding_keywords(candidate)))
        candidate_tags = set(_split_tags("、".join([candidate.industry_tags or "", candidate.platform_tags or "", candidate.strategy_tags or "", candidate.emotion_tags or ""])))
        overlap = base_keywords & candidate_keywords
        tag_overlap = base_tags & candidate_tags
        score = min(100, len(overlap) * 8 + len(tag_overlap) * 12 + (candidate.knowledge_score or 0) * 0.2)
        reasons = []
        if tag_overlap:
            reasons.append("标签机制相近：" + "、".join(list(tag_overlap)[:4]))
        if overlap:
            reasons.append("关键词相似：" + "、".join(list(overlap)[:5]))
        if candidate.industry and candidate.industry == case.industry:
            reasons.append("同行业参考")
            score += 10
        rows.append({"case": candidate, "score": round(score, 2), "reasons": reasons or ["内容结构相近"]})
    return sorted(rows, key=lambda row: row["score"], reverse=True)[:limit]


def related_topics_for_case(db: Session, case: MarketingCase, limit: int = 8) -> list[dict]:
    keywords = set(_split_tags(case.embedding_keywords or _case_embedding_keywords(case)))
    tag_text = " ".join([case.industry_tags or "", case.platform_tags or "", case.strategy_tags or "", case.emotion_tags or "", case.suitable_for or ""])
    topics = db.query(Topic).order_by(desc(Topic.heat_score), Topic.rank.asc()).limit(200).all()
    rows = []
    for topic in topics:
        topic_tokens = set(_topic_keywords(topic.title))
        overlap = keywords & topic_tokens
        score = len(overlap) * 12
        reasons = []
        if topic.platform and topic.platform in _platform_aliases(tag_text):
            score += 18
            reasons.append("平台打法匹配")
        if overlap:
            reasons.append("主题关键词重合：" + "、".join(list(overlap)[:4]))
        if score > 0:
            rows.append({"id": topic.id, "title": topic.title, "platform": topic.platform, "score": round(min(100, score), 2), "reasons": reasons})
    if rows:
        return sorted(rows, key=lambda row: row["score"], reverse=True)[:limit]
    return [
        {
            "id": topic.id,
            "title": topic.title,
            "platform": topic.platform,
            "score": round(min(80, 30 + (topic.heat_score or 0) / 100000), 2),
            "reasons": ["高热热点候选，可人工判断是否关联"],
        }
        for topic in topics[:limit]
    ]


async def import_digitaling_cases(db: Session, limit: int = 100, analyze: bool = True) -> dict:
    fetched = await fetch_digitaling_articles(limit)
    created = 0
    updated = 0
    analyzed = 0

    for item in fetched:
        item["source_url"] = _canonical_source_url(item["source_url"])
        if _is_low_value_case_title(item.get("title")):
            continue
        case = db.query(MarketingCase).filter(MarketingCase.source_url == item["source_url"]).first()
        if case is None:
            raw = CaseRawMaterial(
                source_type="web_link",
                source_url=item["source_url"],
                raw_title=item["title"],
                raw_text=item.get("raw_text"),
                processing_status="raw",
            )
            db.add(raw)
            db.flush()
            case = MarketingCase(source="digitaling", source_category="crawled", raw_material_id=raw.id, **item)
            db.add(case)
            created += 1
        else:
            for key, value in item.items():
                if value:
                    setattr(case, key, value)
            updated += 1
        db.flush()
        if analyze and not case.analyzed_at:
            await structure_case(db, case)
            analyzed += 1
    db.commit()
    return {"fetched": len(fetched), "created": created, "updated": updated, "analyzed": analyzed}


async def fetch_digitaling_articles(limit: int = 100) -> list[dict]:
    async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}, timeout=20, follow_redirects=True) as client:
        article_urls: list[str] = []
        seen: set[str] = set()
        for list_url in DIGITALING_LIST_URLS:
            response = await client.get(list_url)
            response.raise_for_status()
            for url in _extract_article_urls(response.text):
                if url not in seen:
                    article_urls.append(url)
                    seen.add(url)
                if len(article_urls) >= limit:
                    break
            if len(article_urls) >= limit:
                break
        result = []
        for url in article_urls:
            detail = await fetch_digitaling_detail(client, url)
            if detail:
                result.append(detail)
        return result


async def fetch_digitaling_detail(client: httpx.AsyncClient, url: str) -> dict | None:
    response = await client.get(url)
    if response.status_code >= 400:
        return None
    soup = BeautifulSoup(response.text, "html.parser")
    title = _clean_text((soup.find("h1") or soup.find("title")).get_text(" ", strip=True) if soup.find("h1") or soup.find("title") else "")
    if not title:
        title = _clean_text(soup.select_one('meta[property="og:title"]')["content"]) if soup.select_one('meta[property="og:title"]') else ""
    if not title:
        return None

    summary = ""
    for selector in ['meta[name="description"]', 'meta[property="og:description"]']:
        node = soup.select_one(selector)
        if node and node.get("content"):
            summary = _clean_text(node["content"])
            break
    body_node = soup.select_one(".article_content") or soup.select_one(".article-detail") or soup.select_one("article")
    raw_text = _clean_text(body_node.get_text(" ", strip=True)) if body_node else _clean_text(soup.get_text(" ", strip=True))
    raw_text = raw_text[:6000]
    published_at = _extract_date(soup.get_text(" ", strip=True))

    return {
        "source_url": url,
        "title": title[:255],
        "summary": summary[:1000] or raw_text[:300],
        "published_at": published_at,
        "fetched_at": datetime.utcnow(),
        "raw_text": raw_text,
    }


async def analyze_case(db: Session, case: MarketingCase) -> MarketingCase:
    fallback = _heuristic_case_analysis(case)
    data, usage = await deepseek_json(
        "你是资深品牌营销案例分析师。只输出 JSON，不要输出解释。",
        "\n".join(
            [
                "请分析这个营销案例，并输出字段：",
                "creativity, target_audience, execution_highlights, communication_effect, reusable_methods, brand, industry, tags。",
                f"标题：{case.title}",
                f"摘要：{case.summary or ''}",
                f"正文节选：{(case.raw_text or '')[:3500]}",
            ]
        ),
        fallback,
    )
    case.creativity = data.get("creativity") or fallback["creativity"]
    case.target_audience = data.get("target_audience") or fallback["target_audience"]
    case.execution_highlights = data.get("execution_highlights") or fallback["execution_highlights"]
    case.communication_effect = data.get("communication_effect") or fallback["communication_effect"]
    case.reusable_methods = data.get("reusable_methods") or fallback["reusable_methods"]
    case.brand = data.get("brand") or case.brand
    case.industry = data.get("industry") or case.industry
    case.tags = _as_text(data.get("tags") or fallback["tags"])
    case.analyzed_at = datetime.utcnow()
    db.add(case)
    db.add(
        AiUsageLog(
            action="analyze_case",
            target_type="marketing_case",
            target_id=case.id,
            model=usage.get("model") or get_settings().deepseek_model,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            points_used=0,
        )
    )
    db.commit()
    db.refresh(case)
    return case


def calculate_knowledge_score(case: MarketingCase) -> int:
    score = 0
    fields = [
        case.title, case.brand, case.industry, case.summary, case.raw_text,
        case.ai_core_insight, case.creativity, case.target_audience, case.execution_highlights,
        case.communication_effect, case.strategy_patterns, case.repeatable_patterns, case.risk_points,
        case.platform_tags, case.strategy_tags, case.emotion_tags,
    ]
    score += min(45, sum(1 for value in fields if value) * 4)
    if case.communication_effect and len(case.communication_effect) > 20:
        score += 15
    if case.repeatable_patterns and len(case.repeatable_patterns) > 20:
        score += 15
    if case.industry_tags and case.platform_tags:
        score += 10
    if case.risk_points:
        score += 10
    if case.reference_value == "high":
        score += 5
    return max(0, min(100, score))


async def recommend_for_topic(db: Session, topic: Topic, user: UserAccount) -> TopicRecommendation:
    settings = get_settings()
    cost = max(settings.ai_topic_cost_points, 0)
    if user.points_balance < cost:
        raise ValueError("Insufficient points")

    match_rows = search_cases_for_topic(db, topic, limit=5)
    cases = [row["case"] for row in match_rows]
    case_context = "\n\n".join(
        [
            f"案例{index}: {case.title}\n行业：{case.industry or '未知'}\n平台：{case.platform_tags or case.platform or '未知'}\n情绪机制：{case.emotion_tags or '未知'}\n策略标签：{case.strategy_tags or '未知'}\n创意：{case.creativity or case.summary or ''}\n亮点：{case.execution_highlights or ''}\n可复用方法：{case.repeatable_patterns or case.reusable_methods or ''}\n风险点：{case.risk_points or '注意品牌安全边界'}"
            for index, case in enumerate(cases, 1)
        ]
    )
    fallback = _heuristic_topic_recommendation(topic, cases)
    data, usage = await deepseek_json(
        "你是服务品牌客户的社交媒体营销策划总监。结合案例库给出可执行建议，只输出 JSON。",
        "\n".join(
            [
                "请基于热点话题和 RAG 召回案例库，输出字段 recommendation。",
                "recommendation 用中文 Markdown，包含：洞察、RAG召回依据、可借鉴案例、创意方向、目标受众、执行动作、风险边界。",
                f"热点话题：{topic.title}",
                f"平台：{topic.platform}",
                f"热度：{topic.heat_score or 0}",
                "案例库：",
                case_context or "暂无案例库内容，请给出通用社媒建议。",
            ]
        ),
        {"recommendation": fallback},
    )
    user.points_balance -= cost
    user.total_points_used += cost
    selected_case = cases[0] if cases else None
    recommendation = TopicRecommendation(
        user_id=user.id,
        topic_id=topic.id,
        case_id=selected_case.id if selected_case else None,
        prompt_topic=topic.title,
        recommendation=data.get("recommendation") or fallback,
        points_used=cost,
        model=usage.get("model") or settings.deepseek_model,
    )
    db.add(recommendation)
    db.flush()
    for row in match_rows:
        case = row["case"]
        case.call_count = (case.call_count or 0) + 1
        case.last_called_at = datetime.utcnow()
        db.add(
            TopicRecommendationCaseRef(
                recommendation_id=recommendation.id,
                case_id=case.id,
                match_score=float(row.get("score") or 0),
                match_reason="；".join(row.get("reasons") or []),
                used_insight=case.ai_core_insight or case.creativity or case.summary,
            )
        )
    db.add(
        AiUsageLog(
            user_id=user.id,
            action="topic_marketing_recommendation",
            target_type="topic",
            target_id=topic.id,
            model=recommendation.model,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            points_used=cost,
            points_charged=cost,
            success=1,
        )
    )
    db.commit()
    db.refresh(recommendation)
    return recommendation


def _extract_article_urls(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    seen: set[str] = set()
    for link in soup.select('a[href*="/articles/"]'):
        href = link.get("href") or ""
        if not re.search(r"/articles/\d+\.html", href):
            continue
        url = _canonical_source_url(urljoin(DIGITALING_ARTICLES_URL, href))
        if url not in seen:
            urls.append(url)
            seen.add(url)
    return urls


def _extract_date(text: str) -> datetime | None:
    match = re.search(r"(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})", text)
    if match:
        year, month, day = map(int, match.groups())
        return datetime(year, month, day)
    try:
        return parsedate_to_datetime(text)
    except (TypeError, ValueError):
        return None


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _canonical_source_url(url: str | None) -> str:
    return (url or "").split("#")[0].strip()


def _normalized_case_title(title: str | None) -> str:
    text = (title or "").lower()
    text = re.sub(r"\s+", "", text)
    return re.sub(r"[\W_]+", "", text)


def _case_keep_score(case: MarketingCase) -> tuple:
    return (
        case.knowledge_score or 0,
        1 if case.rag_enabled else 0,
        1 if case.callable_by_hotspot else 0,
        1 if "#comment" not in (case.source_url or "") else 0,
        len(case.raw_text or case.summary or ""),
        -(case.id or 0),
    )


def _is_low_value_case_title(title: str | None) -> bool:
    return bool(
        re.search(
            r"(任命|培训的通知|启动通知|提示词|版权费|广告奖证书|PPT公开|齐拜年|分享\d+家新兴广告公司|广告业，拥抱|消费分层|广告学正在落幕|年度品牌洞察|88条复盘|内容营销三大趋势)",
            title or "",
        )
    )


def _topic_keywords(title: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]+|[\u4e00-\u9fff]{2,}", title or "")
    result: list[str] = []
    for token in tokens:
        if len(token) <= 8:
            result.append(token)
        else:
            result.extend(token[index : index + 3] for index in range(0, min(len(token) - 2, 12), 3))
    return result


def _case_embedding_keywords(case: MarketingCase) -> str:
    text = " ".join(
        [
            case.title or "",
            case.brand or "",
            case.industry or "",
            case.summary or "",
            case.creativity or "",
            case.ai_core_insight or "",
            case.marketing_model or "",
            case.sub_models or "",
            case.user_psychology_insights or "",
            case.content_structure_model or "",
            case.target_audience or "",
            case.execution_highlights or "",
            case.communication_effect or "",
            case.repeatable_patterns or "",
            case.strategy_patterns or "",
            case.reusable_methods or "",
            case.industry_tags or "",
            case.platform_tags or "",
            case.strategy_tags or "",
            case.emotion_tags or "",
            case.emotional_mechanisms or "",
            case.suitable_for or "",
        ]
    )
    tokens = _topic_keywords(text)
    tag_tokens = _split_tags("、".join([case.industry_tags or "", case.platform_tags or "", case.strategy_tags or "", case.emotion_tags or ""]))
    seen: set[str] = set()
    result: list[str] = []
    for token in tag_tokens + tokens:
        if token and token not in seen:
            seen.add(token)
            result.append(token)
        if len(result) >= 80:
            break
    return "、".join(result)


def _case_embedding_text(case: MarketingCase) -> str:
    return "\n".join(
        item
        for item in [
            case.title or "",
            case.brand or "",
            case.industry or "",
            case.summary or "",
            case.ai_core_insight or "",
            case.marketing_model or "",
            case.marketing_model_definition or "",
            case.sub_models or "",
            case.why_it_worked or "",
            case.user_psychology_insights or "",
            case.content_structure_model or "",
            case.reusable_strategy_template or "",
            case.repeatable_patterns or "",
            case.strategy_patterns or "",
            case.emotional_mechanisms or "",
            case.platform_strategy or "",
            case.risk_points or "",
            case.suitable_industries or case.suitable_for or "",
            case.unsuitable_industries or case.not_suitable_for or "",
        ]
        if item
    )


def _score_case_match(case: MarketingCase, topic_keywords: list[str], topic_text: str, platform: str | None) -> dict:
    keywords = set(_split_tags(case.embedding_keywords or _case_embedding_keywords(case)))
    topic_set = set(topic_keywords)
    overlap = keywords & topic_set
    score = len(overlap) * 10 + (case.knowledge_score or 0) * 0.25
    reasons: list[str] = []
    if overlap:
        reasons.append("主题相似：" + "、".join(list(overlap)[:5]))
    platform_aliases = _platform_aliases(case.platform_tags or case.platform or "")
    if platform and platform in platform_aliases:
        score += 18
        reasons.append("同平台打法")
    tag_text = " ".join([case.industry_tags or "", case.strategy_tags or "", case.emotion_tags or "", case.suitable_for or ""])
    tag_hits = [tag for tag in _split_tags(tag_text) if tag and tag in topic_text]
    if tag_hits:
        score += len(tag_hits) * 8
        reasons.append("标签命中：" + "、".join(tag_hits[:4]))
    if case.reference_value == "high":
        score += 8
        reasons.append("高价值案例")
    return {"case": case, "score": round(min(100, score), 2), "reasons": reasons or ["高分知识资产兜底召回"]}


def _platform_aliases(text: str) -> set[str]:
    mapping = {
        "小红书": "xiaohongshu",
        "抖音": "douyin",
        "微博": "weibo",
        "B站": "bilibili",
        "哔哩哔哩": "bilibili",
        "知乎": "zhihu",
    }
    result: set[str] = set()
    for label, value in mapping.items():
        if label in text or value in text:
            result.add(value)
    return result


def _as_text(value) -> str:
    if isinstance(value, list):
        return "、".join(str(item) for item in value)
    return str(value or "")


def _heuristic_case_analysis(case: MarketingCase) -> dict:
    return {
        "creativity": f"围绕「{case.title}」建立可被用户转述的核心符号或情绪钩子。",
        "target_audience": "关注品牌新鲜感、生活方式和社交表达的年轻消费人群。",
        "execution_highlights": "用视觉化资产、话题包装、达人扩散和站内外内容分发形成传播闭环。",
        "communication_effect": "适合提升品牌讨论度、内容互动和新品/活动记忆点。",
        "reusable_methods": "提炼一个强符号，匹配一个真实场景，再用多平台内容矩阵放大。",
        "brand": "",
        "industry": "品牌营销",
        "tags": "创意、社交传播、内容营销",
    }


def _heuristic_topic_recommendation(topic: Topic, cases: list[MarketingCase]) -> str:
    case_line = f"可借鉴案例：{cases[0].title}" if cases else "可借鉴案例：暂无匹配案例，先使用通用社媒打法。"
    return "\n".join(
        [
            f"### {topic.title} 营销建议",
            f"- 洞察：该话题在 {topic.platform} 有讨论热度，适合从用户真实情绪和使用场景切入。",
            f"- {case_line}",
            "- 创意方向：把热点改写成品牌可承接的生活场景，不直接硬蹭事件本身。",
            "- 目标受众：关注热点、愿意参与互动表达的年轻用户和垂类兴趣人群。",
            "- 执行动作：短视频/图文首发，达人二创扩散，评论区收集用户故事，次日复盘沉淀清单。",
            "- 风险边界：避开争议站队、夸大承诺和未经授权素材。",
        ]
    )


def _structured_fallback(case: MarketingCase) -> dict:
    return {
        "case_name": case.title,
        "brand": case.brand or "",
        "industry": case.industry or "品牌营销",
        "platforms": _split_tags(case.platform_tags or case.platform or "小红书,抖音,微博"),
        "campaign_goal": case.summary or "提升品牌讨论度和内容互动。",
        "target_audience": _split_tags(case.target_audience or "年轻消费人群,社交媒体活跃用户"),
        "core_insight": case.creativity or f"围绕「{case.title}」建立用户可转述的情绪钩子。",
        "marketing_model": case.marketing_model or "生活方式传播模型",
        "marketing_model_definition": case.marketing_model_definition or _model_definition(case),
        "sub_models": _split_tags(case.sub_models or "去广告化表达,情绪优先于功能,品牌人格化"),
        "user_psychology_insights": _split_tags(case.user_psychology_insights or "用户希望通过品牌表达生活态度,用户愿意分享低广告感内容,用户把品牌当成身份认同符号"),
        "content_structure_model": _split_tags(case.content_structure_model or "反预期切入,情绪洞察,去广告化表达,品牌自然植入,跨平台扩散"),
        "emotional_trigger": _split_tags(case.emotion_tags or "情绪价值,身份认同"),
        "content_strategy": _split_tags(case.execution_highlights or "短视频种草,图文扩散,话题互动"),
        "visual_style": ["高识别符号", "社交平台友好"],
        "platform_strategy": {"小红书": "场景化图文种草", "抖音": "短视频话题演绎", "微博": "话题扩散和公域讨论"},
        "why_it_worked": _split_tags(case.communication_effect or "符号清晰,情绪明确,易于二创"),
        "repeatable_patterns": _split_tags(case.reusable_methods or "强符号 + 真实场景 + 多平台扩散"),
        "risk_points": _split_tags(case.risk_points or "避免过度承诺,避免争议站队,注意素材授权"),
        "suitable_for": _split_tags(case.suitable_for or "消费品牌,生活方式品牌,新品传播"),
        "not_suitable_for": _split_tags(case.not_suitable_for or "高敏感公共议题,强监管行业硬蹭热点"),
        "reference_value": case.reference_value or "medium",
        "knowledge_level": case.knowledge_level or _knowledge_level(case),
        "reusable_strategy_template": _template_fallback(case),
    }


def _apply_structured_data(case: MarketingCase, data: dict) -> None:
    case.title = (data.get("case_name") or case.title)[:255]
    case.brand = _as_text(data.get("brand")) or case.brand
    case.industry = _as_text(data.get("industry")) or case.industry
    case.platform_tags = _as_text(data.get("platforms"))
    case.target_audience = _as_text(data.get("target_audience"))
    case.creativity = _as_text(data.get("core_insight"))
    case.ai_core_insight = _as_text(data.get("core_insight")) or case.creativity
    case.why_it_worked = _as_text(data.get("why_it_worked")) or case.why_it_worked
    case.marketing_model = _as_text(data.get("marketing_model")) or case.marketing_model or _infer_marketing_model(case)
    case.marketing_model_definition = _as_text(data.get("marketing_model_definition")) or case.marketing_model_definition or _model_definition(case)
    case.marketing_model_confidence = float(data.get("marketing_model_confidence") or case.marketing_model_confidence or 0.75)
    case.sub_models = _as_text(data.get("sub_models")) or case.sub_models
    case.user_psychology_insights = _as_text(data.get("user_psychology_insights")) or case.user_psychology_insights
    case.content_structure_model = _as_text(data.get("content_structure_model")) or case.content_structure_model
    case.reusable_strategy_template = json.dumps(data.get("reusable_strategy_template") or _template_fallback(case), ensure_ascii=False, indent=2)
    case.execution_highlights = _as_text(data.get("content_strategy"))
    case.communication_effect = _as_text(data.get("why_it_worked"))
    case.repeatable_patterns = _as_text(data.get("repeatable_patterns"))
    case.strategy_patterns = case.repeatable_patterns
    case.risk_points = _as_text(data.get("risk_points"))
    case.suitable_for = _as_text(data.get("suitable_for"))
    case.suitable_industries = case.suitable_for
    case.not_suitable_for = _as_text(data.get("not_suitable_for"))
    case.unsuitable_industries = case.not_suitable_for
    case.emotion_tags = _as_text(data.get("emotional_trigger"))
    case.emotional_mechanisms = case.emotion_tags
    case.platform_strategy = json.dumps(data.get("platform_strategy") or {}, ensure_ascii=False, indent=2)
    case.strategy_tags = _infer_strategy_tags(case)
    case.industry_tags = case.industry
    case.reference_value = data.get("reference_value") if data.get("reference_value") in {"high", "medium", "low"} else "medium"
    case.knowledge_level = data.get("knowledge_level") or _knowledge_level(case)
    case.structured_json = json.dumps(data, ensure_ascii=False, indent=2)
    case.embedding_keywords = _case_embedding_keywords(case)


def _knowledge_level(case: MarketingCase) -> str:
    score = case.knowledge_score or 0
    if score >= 92:
        return "S级案例"
    if case.reference_value == "high" or score >= 82:
        return "A级案例"
    if case.repeatable_patterns or case.strategy_patterns:
        return "高复用案例"
    if case.industry_tags or case.industry:
        return "高行业参考价值"
    return "热点高适配"


def _infer_marketing_model(case: MarketingCase) -> str:
    text = " ".join([case.title or "", case.ai_core_insight or "", case.strategy_patterns or "", case.emotional_mechanisms or ""])
    if "松弛" in text or "生活" in text:
        return "生活方式传播模型"
    if "陪伴" in text or "家庭" in text:
        return "家庭陪伴型传播"
    if "社交" in text or "身份" in text:
        return "社交货币传播模型"
    if "反差" in text:
        return "反差传播模型"
    if "治愈" in text:
        return "治愈系传播模型"
    return "情绪价值传播模型"


def _model_definition(case: MarketingCase) -> str:
    model = case.marketing_model or _infer_marketing_model(case)
    definitions = {
        "生活方式传播模型": "通过生活方式、场景审美和用户自我投射替代直接产品卖点，让品牌成为用户表达生活态度的媒介。",
        "家庭陪伴型传播": "把产品或品牌转化为家庭关系、陪伴感和安全感的载体，降低功能表达的距离感。",
        "社交货币传播模型": "制造用户愿意转发、讨论和二创的身份符号，让内容成为社交表达素材。",
        "反差传播模型": "用反预期表达打破品类惯性，制造记忆点和讨论入口。",
        "治愈系传播模型": "用轻情绪、低压力和陪伴感建立内容亲近感，适合长期心智建设。",
        "情绪价值传播模型": "通过情绪价值、身份认同和内容场景替代单纯功能沟通，让用户愿意主动传播。",
    }
    return definitions.get(model, definitions["情绪价值传播模型"])


def _template_fallback(case: MarketingCase) -> dict:
    return {
        "template_name": f"{_infer_marketing_model(case)}策略模板",
        "suitable_scenarios": _split_tags(case.suitable_industries or case.suitable_for or "新消费品牌,生活方式品牌,女性消费,高审美内容传播"),
        "core_flow": _split_tags("情绪洞察,真实场景,低广告感表达,品牌自然融入,用户自我投射,跨平台扩散"),
        "platform_adaptation": {
            "xiaohongshu": ["情绪种草", "生活方式清单"],
            "douyin": ["视觉节奏", "情绪场景演绎"],
            "weibo": ["话题扩散", "观点讨论"],
            "bilibili": ["品牌态度解读", "深度复盘"],
        },
        "callable_systems": ["热点雷达", "图文生产", "Campaign执行", "PPT提案"],
    }


def _split_tags(value: str) -> list[str]:
    return [item.strip() for item in re.split(r"[、,，;；\n]", value or "") if item.strip()][:8]


def _infer_strategy_tags(case: MarketingCase) -> str:
    text = " ".join([case.title or "", case.summary or "", case.creativity or "", case.execution_highlights or ""])
    candidates = ["情绪价值", "社交货币", "反差传播", "事件营销", "IP联名", "用户共创", "KOL种草", "话题挑战", "争议讨论", "内容种草", "品牌年轻化"]
    hits = [tag for tag in candidates if tag in text]
    if hits:
        return "、".join(hits)
    return "情绪价值、内容种草"


def _backfill_case_pipeline(db: Session) -> None:
    changed = False
    for case in db.query(MarketingCase).limit(500).all():
        if not case.source_category:
            case.source_category = "crawled" if case.source == "digitaling" else "manual"
        if not case.pipeline_stage:
            case.pipeline_stage = "ai_structured" if case.analyzed_at else "raw"
        if not case.structure_status:
            case.structure_status = "ai_structured" if case.analyzed_at else "pending"
        if not case.review_status:
            case.review_status = "pending"
        if not case.reference_value:
            case.reference_value = "medium"
        if not case.embedding_status:
            case.embedding_status = "not_started"
        if case.rag_enabled and not case.embedding_keywords:
            case.embedding_keywords = _case_embedding_keywords(case)
            case.embedding_status = "embedded"
        if not case.updated_at:
            case.updated_at = case.analyzed_at or case.fetched_at or datetime.utcnow()
        if not case.ai_core_insight:
            case.ai_core_insight = case.creativity or case.summary
        if not case.why_it_worked:
            case.why_it_worked = case.communication_effect
        if not case.strategy_patterns:
            case.strategy_patterns = case.repeatable_patterns or case.reusable_methods
        if not case.emotional_mechanisms:
            case.emotional_mechanisms = case.emotion_tags
        if not case.marketing_model:
            case.marketing_model = _infer_marketing_model(case)
        if not case.marketing_model_definition:
            case.marketing_model_definition = _model_definition(case)
        if not case.marketing_model_confidence:
            case.marketing_model_confidence = 0.75
        if not case.sub_models:
            case.sub_models = "去广告化表达、情绪优先于功能、品牌人格化"
        if not case.user_psychology_insights:
            case.user_psychology_insights = "用户愿意通过品牌表达生活态度、用户偏好低广告感内容、用户把品牌当成身份认同符号"
        if not case.content_structure_model:
            case.content_structure_model = "反预期切入、情绪洞察、去广告化表达、品牌自然植入、跨平台扩散"
        if not case.reusable_strategy_template:
            case.reusable_strategy_template = json.dumps(_template_fallback(case), ensure_ascii=False)
        if not case.suitable_industries:
            case.suitable_industries = case.suitable_for
        if not case.unsuitable_industries:
            case.unsuitable_industries = case.not_suitable_for
        if not case.platform_strategy:
            case.platform_strategy = json.dumps({"xiaohongshu": ["场景化种草"], "douyin": ["短视频演绎"], "weibo": ["话题扩散"], "bilibili": ["深度内容复盘"]}, ensure_ascii=False)
        new_score = calculate_knowledge_score(case)
        if case.knowledge_score != new_score:
            case.knowledge_score = new_score
        if not case.knowledge_level:
            case.knowledge_level = _knowledge_level(case)
        if case.rag_enabled and not case.callable_by_hotspot:
            case.callable_by_hotspot = 1
        changed = True
    if changed:
        db.commit()


def _ensure_raw_materials(db: Session) -> None:
    changed = False
    for case in db.query(MarketingCase).filter(MarketingCase.raw_material_id.is_(None)).limit(500).all():
        raw = CaseRawMaterial(
            source_type="web_link" if case.source_url else "markdown",
            source_url=case.source_url,
            raw_title=case.title,
            raw_text=case.raw_text or case.summary,
            processing_status=case.pipeline_stage or "raw",
        )
        db.add(raw)
        db.flush()
        case.raw_material_id = raw.id
        changed = True
    if changed:
        db.commit()
