from datetime import datetime, timedelta


PLATFORMS = ["weibo", "douyin", "xiaohongshu", "zhihu", "bilibili"]

MOCK_TOPICS = {
    "weibo": [
        "春夏新品如何借势出圈",
        "五一后错峰旅行热度上涨",
        "国货护肤成分党讨论",
        "AI 手机影像大赛",
        "低糖饮品新口味测评",
        "职场人周三自救指南",
        "热门剧集角色同款穿搭",
        "城市露营回归",
        "品牌联名翻车复盘",
        "高考倒计时情绪陪伴",
    ],
    "douyin": [
        "AI 手机影像大赛",
        "低糖饮品新口味测评",
        "城市露营回归",
        "三分钟早餐挑战",
        "健身房新手避坑",
        "热门剧集角色同款穿搭",
        "县城咖啡店打卡",
        "宠物智能用品测评",
        "毕业季宿舍改造",
        "春夏新品如何借势出圈",
    ],
    "xiaohongshu": [
        "国货护肤成分党讨论",
        "春夏新品如何借势出圈",
        "县城咖啡店打卡",
        "毕业季宿舍改造",
        "通勤包真实容量",
        "低糖饮品新口味测评",
        "高考倒计时情绪陪伴",
        "小户型香氛布置",
        "城市露营回归",
        "品牌联名翻车复盘",
    ],
    "zhihu": [
        "AI 手机影像大赛",
        "品牌联名翻车复盘",
        "高考倒计时情绪陪伴",
        "职场人周三自救指南",
        "低糖饮品新口味测评",
        "小城市青年消费变化",
        "新能源车补能体验",
        "国货护肤成分党讨论",
        "五一后错峰旅行热度上涨",
        "热门剧集角色同款穿搭",
    ],
    "bilibili": [
        "AI 手机影像大赛",
        "热门剧集角色同款穿搭",
        "毕业季宿舍改造",
        "新能源车补能体验",
        "低糖饮品新口味测评",
        "城市露营回归",
        "国货护肤成分党讨论",
        "三分钟早餐挑战",
        "职场人周三自救指南",
        "县城咖啡店打卡",
    ],
}


def mock_items(platform: str) -> list[dict]:
    now = datetime.utcnow()
    titles = MOCK_TOPICS.get(platform, [])
    rows = []
    for idx, title in enumerate(titles, start=1):
        heat = max(1000, 980000 - idx * 63500 + len(title) * 321)
        rows.append(
            {
                "platform": platform,
                "source_type": "mock",
                "title": title,
                "rank": idx,
                "heat_score": float(heat),
                "url": f"https://example.com/{platform}/hot/{idx}",
                "category": "营销热点" if idx % 3 else "社会讨论",
                "author_name": None,
                "content_type": "hot_topic",
                "collected_at": now - timedelta(minutes=idx * 3),
            }
        )
    return rows
