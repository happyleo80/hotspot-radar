from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Topic, TopicAIAnalysis
from app.services.topic_service import high_risk_topics, high_value_topics


def _heuristic_analysis(topic: Topic) -> dict:
    title = topic.title
    risk = "高" if any(word in title for word in ["翻车", "争议", "投诉", "道歉"]) else "中" if "高考" in title else "低"
    value = "高" if any(word in title for word in ["AI", "新品", "测评", "旅行", "穿搭", "护肤"]) else "中"
    sentiment = "谨慎" if risk == "高" else "积极" if value == "高" else "中性"
    return {
        "summary": f"{title} 正在 {topic.platform} 形成可观察讨论，适合做跨平台营销观察。",
        "why_it_trends": "话题兼具实用信息、情绪表达和社交传播点，容易被榜单与内容平台共同放大。",
        "sentiment": sentiment,
        "risk_level": risk,
        "marketing_value": value,
        "suitable_industries": "消费电子、美妆个护、食品饮料、旅游本地生活、教育服务",
        "unsuitable_industries": "严肃金融、医疗诊断、强监管品类、与争议事件直接相关的品牌",
        "marketing_angles": "用真实场景切入，做轻量测评、清单化攻略、用户故事或热点二创。",
        "content_ideas": "1. 三张图讲清趋势；2. 达人真实体验短视频；3. 品牌评论区问答；4. 行业版热点解读。",
        "risk_notes": "避免夸大承诺、蹭负面情绪、使用未经授权素材或引导站队。",
    }


def analyze_topic(db: Session, topic: Topic) -> TopicAIAnalysis:
    data = _heuristic_analysis(topic)
    analysis = TopicAIAnalysis(topic_id=topic.id, created_at=datetime.utcnow(), **data)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def latest_or_create_analysis(db: Session, topic: Topic) -> TopicAIAnalysis:
    latest = sorted(topic.analyses, key=lambda item: item.created_at, reverse=True)
    return latest[0] if latest else analyze_topic(db, topic)


def generate_brief(db: Session, topics: list[Topic], resonance: list[dict]) -> str:
    top = topics[:10]
    good = high_value_topics(db, limit=8)
    risky = high_risk_topics(db, limit=8)
    top_resonance = resonance[:5]
    lines = [
        "# 今日热点营销简报",
        "",
        f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "## 今日热点概览",
        f"- 共监测 {len(topics)} 条热点，覆盖微博、抖音、小红书、知乎、B站。",
        f"- 识别跨平台共振话题 {len(resonance)} 个，其中 {len(top_resonance)} 个适合作为今日观察重点。",
        f"- 筛出适合社媒借势的话题 {len(good)} 个，高风险或需谨慎监测的话题 {len(risky)} 个。",
        "",
        "## 今日全网声量 Top 10",
    ]
    lines += [
        f"{idx}. {topic.title}（{_platform_name(topic.platform)}，热度 {int(topic.heat_score or 0)}）"
        for idx, topic in enumerate(top, 1)
    ]

    lines += ["", "## 跨平台共振观察"]
    lines += [
        f"- {item['title']}：覆盖{len(item['platforms'])}个平台，关联平台：{'、'.join(_platform_name(platform) for platform in item['platforms'])}。"
        for item in top_resonance
    ] or ["- 暂无明显跨平台共振话题。"]

    lines += ["", "## 适合社媒借势的话题"]
    lines += [
        f"- {topic.title}（{_platform_name(topic.platform)}）：{_marketing_reason(topic.title)}，建议做{_content_suggestion(topic.title)}。"
        for topic in good
    ] or ["- 暂无明显高价值热点。"]

    lines += ["", "## 不建议跟进的话题"]
    lines += [
        f"- {topic.title}（{_platform_name(topic.platform)}）：{_risk_reason(topic.title)}，建议只做监测，不做品牌借势。"
        for topic in risky[:6]
    ] or ["- 暂无明显高风险热点。"]

    lines += [
        "",
        "## 分行业机会",
        "- 旅游本地生活：围绕旅行记忆、拍照出片、目的地美景做种草内容。",
        "- 美妆个护：围绕卸妆前练妆、妆容挑战、真实测评做短视频与图文教程。",
        "- 食品餐饮：围绕日常美食教程、轻量食谱、办公室分享做清单化内容。",
        "- 礼品零售：围绕 520 礼物、不撞款、有趣表达做节点选题。",
        "",
        "## 今日内容选题建议",
    ]
    lines += [
        f"- 《{topic.title}》延展：{_content_suggestion(topic.title)}。"
        for topic in good[:5]
    ] or ["- 暂无可直接延展的内容选题。"]
    lines += [
        "",
        "## 客户提案方向",
        "- 用跨平台共振话题做开场洞察，用高营销价值话题承接内容矩阵。",
        "- 对高风险话题单独列出不建议跟进清单，体现品牌安全判断。",
    ]
    return "\n".join(lines)


def _platform_name(platform: str) -> str:
    return {
        "weibo": "微博",
        "douyin": "抖音",
        "xiaohongshu": "小红书",
        "zhihu": "知乎",
        "bilibili": "B站",
    }.get(platform, platform)


def _marketing_reason(title: str) -> str:
    if any(word in title for word in ["旅行", "美景", "赛里木湖", "日照金山", "古诗词"]):
        return "具备旅行种草和目的地内容延展空间"
    if any(word in title for word in ["拍照", "出片", "海鸥雨"]):
        return "适合视觉化表达和用户模仿参与"
    if any(word in title for word in ["美食", "教程", "get"]):
        return "适合做教程清单和轻量生活方式内容"
    if any(word in title for word in ["礼物", "520"]):
        return "贴合节点消费和送礼决策场景"
    if any(word in title for word in ["卸妆", "练妆", "穿搭", "护肤", "测评"]):
        return "适合美妆穿搭类达人共创"
    return "具备内容化表达空间"


def _content_suggestion(title: str) -> str:
    if any(word in title for word in ["旅行", "美景", "赛里木湖", "日照金山", "古诗词"]):
        return "目的地清单、拍照路线、用户故事征集"
    if any(word in title for word in ["美食", "教程", "get"]):
        return "三步教程、食材清单、短视频复刻挑战"
    if any(word in title for word in ["礼物", "520"]):
        return "礼物清单、预算分层、情侣互动话题"
    if any(word in title for word in ["卸妆", "练妆", "穿搭", "护肤", "测评"]):
        return "妆容挑战、前后对比、达人真实测评"
    return "图文拆解、短视频二创、评论区互动问答"


def _risk_reason(title: str) -> str:
    if any(word in title for word in ["起诉", "退款", "投诉"]):
        return "涉及消费纠纷和潜在维权情绪"
    if any(word in title for word in ["偷拍", "裙底", "违法"]):
        return "涉及违法违规或公共伦理争议"
    if any(word in title for word in ["谣言", "造谣", "被罚"]):
        return "涉及谣言治理和处罚信息"
    if any(word in title for word in ["道歉", "争议", "翻车"]):
        return "舆情情绪不稳定，品牌借势容易反噬"
    return "存在品牌安全不确定性"
