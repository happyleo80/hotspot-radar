from collections import defaultdict
from datetime import datetime, timedelta
import re

from sqlalchemy import case, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.collectors.mock_data import PLATFORMS, mock_items
from app.collectors.api_clients import ThirdPartyHotspotClient
from app.models import Topic, TopicAIAnalysis, TopicMetric
from app.services.normalizer import normalize_title


def upsert_topic(db: Session, item: dict) -> Topic:
    normalized = normalize_title(item["title"])
    topic = (
        db.query(Topic)
        .filter(Topic.platform == item["platform"], Topic.normalized_title == normalized)
        .first()
    )
    now = item.get("collected_at") or datetime.utcnow()
    if topic is None:
        topic = Topic(
            platform=item["platform"],
            source_type=item.get("source_type", "api"),
            title=item["title"],
            normalized_title=normalized,
            rank=item.get("rank"),
            heat_score=item.get("heat_score"),
            url=item.get("url"),
            category=item.get("category"),
            author_name=item.get("author_name"),
            content_type=item.get("content_type"),
            collected_at=now,
            first_seen_at=now,
            last_seen_at=now,
        )
        db.add(topic)
        db.flush()
    else:
        topic.title = item["title"]
        topic.rank = item.get("rank")
        topic.heat_score = item.get("heat_score")
        topic.url = item.get("url") or topic.url
        topic.category = item.get("category") or topic.category
        topic.author_name = item.get("author_name") or topic.author_name
        topic.content_type = item.get("content_type") or topic.content_type
        topic.source_type = item.get("source_type", topic.source_type)
        topic.collected_at = now
        topic.last_seen_at = now

    db.add(
        TopicMetric(
            topic_id=topic.id,
            rank=item.get("rank"),
            heat_score=item.get("heat_score"),
            view_count=item.get("view_count"),
            like_count=item.get("like_count"),
            comment_count=item.get("comment_count"),
            share_count=item.get("share_count"),
            favorite_count=item.get("favorite_count"),
            coin_count=item.get("coin_count"),
            danmaku_count=item.get("danmaku_count"),
            collected_at=now,
        )
    )
    return topic


def seed_mock_data(db: Session) -> None:
    sanitize_source_labels(db)
    if db.query(Topic).count() > 0:
        db.commit()
        return
    for platform in PLATFORMS:
        for item in mock_items(platform):
            upsert_topic(db, item)
    db.commit()


def sanitize_source_labels(db: Session) -> None:
    db.query(Topic).filter(Topic.category.in_(["Rebang 热榜", "TopHub 热榜"])).update(
        {Topic.category: "热点话题"}, synchronize_session=False
    )
    db.query(Topic).filter(Topic.source_type.in_(["rebang", "tophub"])).update(
        {Topic.source_type: "api"}, synchronize_session=False
    )


def collect_platform(db: Session, platform: str) -> dict:
    if platform not in PLATFORMS:
        raise ValueError(f"Unsupported platform: {platform}")
    client = ThirdPartyHotspotClient()
    items = client.fetch_rebang_platform(platform)
    source = "api" if items else "mock"
    if not items:
        items = client.fetch_tophub_platform(platform)
        source = "api" if items else "mock"
    if not items:
        items = mock_items(platform)
    for item in items:
        upsert_topic(db, item)
    db.commit()
    return {"platform": platform, "count": len(items), "source": source}


def collect_all(db: Session) -> dict:
    result = [collect_platform(db, platform) for platform in PLATFORMS]
    return {"platforms": result, "total": sum(row["count"] for row in result)}


def list_topics(db: Session, platform: str | None = None, limit: int = 50) -> list[Topic]:
    query = db.query(Topic).options(joinedload(Topic.analyses))
    if platform:
        query = query.filter(Topic.platform == platform)
    latest_collected_at = query.with_entities(func.max(Topic.collected_at)).scalar()
    if latest_collected_at:
        query = query.filter(Topic.collected_at >= latest_collected_at - timedelta(minutes=45))
    if platform:
        return query.order_by(_source_priority(), Topic.rank.asc().nullslast(), desc(Topic.heat_score)).limit(limit).all()
    return query.order_by(_source_priority(), desc(Topic.heat_score), Topic.rank.asc().nullslast()).limit(limit).all()


def _source_priority():
    return case((Topic.source_type == "mock", 1), else_=0)


def get_topic(db: Session, topic_id: int) -> Topic | None:
    return (
        db.query(Topic)
        .options(joinedload(Topic.metrics), joinedload(Topic.analyses))
        .filter(Topic.id == topic_id)
        .first()
    )


def resonance_topics(db: Session) -> list[dict]:
    rows = _resonance_source_rows(db)
    if not rows:
        return []

    parent = list(range(len(rows)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for left_index, left_topic in enumerate(rows):
        for right_index in range(left_index + 1, len(rows)):
            right_topic = rows[right_index]
            if left_topic.platform == right_topic.platform:
                continue
            if _topics_are_related(left_topic, right_topic):
                union(left_index, right_index)

    groups: dict[int, list[Topic]] = defaultdict(list)
    for index, topic in enumerate(rows):
        groups[find(index)].append(topic)

    result = []
    for topics in groups.values():
        topics_by_platform = _best_topics_by_platform(topics)
        platforms = sorted(topics_by_platform, key=_platform_sort_key)
        if len(platforms) < 2:
            continue
        display_topics = [topics_by_platform[platform] for platform in platforms]
        title = _canonical_resonance_title(display_topics)
        result.append(
            {
                "normalized_title": normalize_title(title),
                "title": title,
                "platforms": platforms,
                "platform_count": len(platforms),
                "max_heat_score": max(topic.heat_score or 0 for topic in display_topics),
                "topics": [_topic_summary(topic) for topic in display_topics],
            }
        )
    return sorted(result, key=lambda item: (item["platform_count"], item["max_heat_score"]), reverse=True)


def _resonance_source_rows(db: Session) -> list[Topic]:
    query = db.query(Topic)
    latest_collected_at = query.with_entities(func.max(Topic.collected_at)).scalar()
    if latest_collected_at:
        query = query.filter(Topic.collected_at >= latest_collected_at - timedelta(minutes=45))
    query = query.order_by(_source_priority(), desc(Topic.heat_score), Topic.rank.asc())
    real_rows = query.filter(Topic.source_type != "mock").limit(240).all()
    if real_rows:
        return real_rows
    return query.limit(240).all()


_GENERIC_TOKENS = {
    "一个",
    "这个",
    "那个",
    "什么",
    "怎么",
    "为何",
    "为什么",
    "如何",
    "看待",
    "评价",
    "是否",
    "可以",
    "成为",
    "最新",
    "官方",
    "回应",
    "首次",
    "当前",
    "视频",
    "直播",
    "网友",
    "中国",
    "我国",
    "人员",
    "名单",
    "随行",
    "在即",
    "启程",
    "到底",
    "多少",
    "重要",
}


def _topic_tokens(topic: Topic) -> set[str]:
    text = normalize_title(topic.title)
    for token in sorted(_GENERIC_TOKENS, key=len, reverse=True):
        text = text.replace(token, "")

    tokens: set[str] = set()
    for chunk in re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]+", text):
        if re.fullmatch(r"[a-z0-9]+", chunk):
            if len(chunk) >= 2:
                tokens.add(chunk)
            continue
        if 2 <= len(chunk) <= 8:
            tokens.add(chunk)
        for size in (2, 3, 4):
            if len(chunk) >= size:
                tokens.update(chunk[index : index + size] for index in range(len(chunk) - size + 1))
    return {token for token in tokens if len(token) >= 2 and token not in _GENERIC_TOKENS}


def _topics_are_related(left: Topic, right: Topic) -> bool:
    left_title = left.normalized_title or normalize_title(left.title)
    right_title = right.normalized_title or normalize_title(right.title)
    shorter, longer = sorted((left_title, right_title), key=len)
    if len(shorter) >= 4 and shorter in longer:
        return True

    left_tokens = _topic_tokens(left)
    right_tokens = _topic_tokens(right)
    if not left_tokens or not right_tokens:
        return False

    overlap = left_tokens & right_tokens
    if not overlap:
        return False

    strong_overlap = {token for token in overlap if len(token) >= 3}
    overlap_ratio = len(overlap) / max(1, min(len(left_tokens), len(right_tokens)))
    return (strong_overlap and overlap_ratio >= 0.25) or len(strong_overlap) >= 2


def _best_topics_by_platform(topics: list[Topic]) -> dict[str, Topic]:
    best: dict[str, Topic] = {}
    for topic in topics:
        current = best.get(topic.platform)
        if current is None or (topic.heat_score or 0) > (current.heat_score or 0):
            best[topic.platform] = topic
    return best


def _platform_sort_key(platform: str) -> int:
    try:
        return PLATFORMS.index(platform)
    except ValueError:
        return len(PLATFORMS)


_RISK_SIGNALS: tuple[tuple[str, int], ...] = (
    ("翻车", 5),
    ("起诉", 5),
    ("偷拍", 5),
    ("裙底", 5),
    ("被罚", 5),
    ("谣言", 4),
    ("造谣", 4),
    ("投诉", 4),
    ("退款", 4),
    ("调查", 4),
    ("违规", 4),
    ("违法", 4),
    ("道歉", 3),
    ("争议", 3),
    ("曝光", 3),
    ("事故", 3),
    ("食品安全", 3),
    ("医疗", 2),
    ("高考", 2),
)


_MARKETING_VALUE_SIGNALS: tuple[tuple[str, int], ...] = (
    ("旅行", 6),
    ("拍照", 6),
    ("出片", 6),
    ("美食", 6),
    ("教程", 6),
    ("礼物", 6),
    ("520", 5),
    ("卸妆", 5),
    ("练妆", 5),
    ("穿搭", 5),
    ("护肤", 5),
    ("测评", 5),
    ("清单", 5),
    ("攻略", 5),
    ("日常", 4),
    ("生活", 4),
    ("好物", 4),
    ("记忆", 4),
    ("古诗词", 4),
    ("美景", 4),
    ("日照金山", 4),
    ("赛里木湖", 4),
    ("海鸥雨", 4),
    ("get", 4),
    ("新口味", 4),
    ("新品", 4),
    ("AI", 3),
)

_MARKETING_EXCLUDE_SIGNALS = (
    "特朗普",
    "外交部",
    "总统",
    "访华",
    "窜台",
    "政治",
    "关税",
    "战争",
    "军事",
    "处罚",
    "被罚",
    "谣言",
    "偷拍",
    "起诉",
    "退款",
    "违法",
    "事故",
    "高考",
    "公务员",
)


def _topic_risk_score(topic: Topic) -> int:
    title = topic.title or ""
    score = sum(weight for keyword, weight in _RISK_SIGNALS if keyword in title)
    if any(analysis.risk_level in {"高", "high"} for analysis in topic.analyses):
        score += 6
    return score


def _topic_marketing_value_score(topic: Topic) -> int:
    title = topic.title or ""
    if _topic_risk_score(topic) > 0:
        return 0
    if any(keyword in title for keyword in _MARKETING_EXCLUDE_SIGNALS):
        return 0

    score = sum(weight for keyword, weight in _MARKETING_VALUE_SIGNALS if keyword in title)
    if topic.platform in {"xiaohongshu", "douyin"}:
        score += 3
    if topic.platform == "bilibili":
        score += 1
    if any(analysis.marketing_value in {"高", "high"} for analysis in topic.analyses):
        score += 5
    if topic.heat_score:
        score += min(int(topic.heat_score // 2_000_000), 5)
    return score


def _canonical_resonance_title(topics: list[Topic]) -> str:
    def sort_key(topic: Topic) -> tuple[int, int, float]:
        title_length = len(topic.title)
        is_long = 1 if title_length > 20 else 0
        return (is_long, title_length, -(topic.heat_score or 0))

    return sorted(topics, key=sort_key)[0].title


def _topic_summary(topic: Topic) -> dict:
    return {
        "id": topic.id,
        "platform": topic.platform,
        "source_type": topic.source_type,
        "title": topic.title,
        "normalized_title": topic.normalized_title,
        "rank": topic.rank,
        "heat_score": topic.heat_score,
        "url": topic.url,
        "category": topic.category,
        "content_type": topic.content_type,
        "collected_at": topic.collected_at,
        "first_seen_at": topic.first_seen_at,
        "last_seen_at": topic.last_seen_at,
        "analyses": [],
    }


def rising_topics(db: Session, limit: int = 20) -> list[Topic]:
    query = _recent_topics_query(db)
    return (
        query
        .order_by(desc(Topic.heat_score), Topic.rank.asc())
        .limit(limit)
        .all()
    )


def high_value_topics(db: Session, limit: int = 20) -> list[Topic]:
    rows = (
        _recent_topics_query(db)
        .options(joinedload(Topic.analyses))
        .order_by(_source_priority(), desc(Topic.heat_score), Topic.rank.asc())
        .limit(300)
        .all()
    )
    real_rows = [topic for topic in rows if topic.source_type != "mock"]
    source_rows = real_rows or rows
    valuable_rows = [topic for topic in source_rows if _topic_marketing_value_score(topic) >= 6]

    selected: list[Topic] = []
    for topic in sorted(valuable_rows, key=lambda item: (_topic_marketing_value_score(item), item.heat_score or 0), reverse=True):
        if any(topic.normalized_title == item.normalized_title or _topics_are_related(topic, item) for item in selected):
            continue
        selected.append(topic)
        if len(selected) >= limit:
            break

    return selected


def high_risk_topics(db: Session, limit: int = 20) -> list[Topic]:
    rows = (
        _recent_topics_query(db)
        .options(joinedload(Topic.analyses))
        .order_by(_source_priority(), desc(Topic.heat_score), Topic.rank.asc())
        .limit(300)
        .all()
    )
    real_rows = [topic for topic in rows if topic.source_type != "mock"]
    source_rows = real_rows or rows
    risky_rows = [topic for topic in source_rows if _topic_risk_score(topic) > 0]

    selected: list[Topic] = []
    selected_keys: set[str] = set()
    for topic in sorted(risky_rows, key=lambda item: (_topic_risk_score(item), item.heat_score or 0), reverse=True):
        event_key = _risk_event_key(topic)
        if event_key in selected_keys:
            continue
        if any(topic.normalized_title == item.normalized_title or _risk_topics_are_related(topic, item) for item in selected):
            continue
        selected.append(topic)
        selected_keys.add(event_key)
        if len(selected) >= limit:
            break

    return selected


def _recent_topics_query(db: Session):
    query = db.query(Topic)
    latest_collected_at = query.with_entities(func.max(Topic.collected_at)).scalar()
    if latest_collected_at:
        query = query.filter(Topic.collected_at >= latest_collected_at - timedelta(minutes=45))
    return query


def _risk_topics_are_related(left: Topic, right: Topic) -> bool:
    if _topics_are_related(left, right):
        return True

    left_signals = {keyword for keyword, _ in _RISK_SIGNALS if keyword in (left.title or "")}
    right_signals = {keyword for keyword, _ in _RISK_SIGNALS if keyword in (right.title or "")}
    if not left_signals or not right_signals or not left_signals.intersection(right_signals):
        return False

    overlap = _topic_tokens(left) & _topic_tokens(right)
    strong_overlap = {token for token in overlap if len(token) >= 3}
    if {"偷拍", "裙底"}.issubset(overlap):
        return True
    return len(strong_overlap) >= 2 or len(overlap) >= 4


def _risk_event_key(topic: Topic) -> str:
    title = topic.title or ""
    if "偷拍" in title and any(word in title for word in ["拟录", "公务员", "南京审计", "南审", "江苏税务", "裙底男生"]):
        return "偷拍拟录公务员"
    if "人造大米" in title:
        return "人造大米谣言"
    if "张静初" in title or "优思益" in title:
        return "张静初带货争议"
    return topic.normalized_title
