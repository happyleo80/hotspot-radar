import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings

TOPHUB_SOURCES = {
    "zhihu": "https://tophub.today/n/mproPpoq6O",
    "weibo": "https://tophub.today/n/KqndgxeLl9",
    "bilibili": "https://tophub.today/n/74KvxwokxM",
    "douyin": "https://tophub.today/n/DpQvNABoNE",
    "xiaohongshu": "https://tophub.today/n/L4MdA5ldxD",
}

REBANG_SOURCES = {
    "zhihu": {"query": "tab=zhihu&date_type=now", "version": 1, "url": "https://rebang.today/?tab=zhihu"},
    "xiaohongshu": {"query": "tab=xiaohongshu&sub_tab=hot-search", "version": 1, "url": "https://rebang.today/?tab=xiaohongshu"},
    "weibo": {"query": "tab=weibo&sub_tab=search", "version": 2, "url": "https://rebang.today/?tab=weibo"},
    "bilibili": {"query": "tab=bilibili&sub_tab=popular&date_type=now", "version": 1, "url": "https://rebang.today/?tab=bilibili"},
    "douyin": {"query": "tab=douyin&date_type=now", "version": 1, "url": "https://rebang.today/?tab=douyin"},
}


class ThirdPartyHotspotClient:
    """Thin adapter layer for authorized hotspot APIs.

    The MVP defaults to mock data. Wire provider-specific endpoints here when
    TianAPI, ALAPI, Jisu, or a licensed Xiaohongshu data service is configured.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        self.rebang_headers = {
            "User-Agent": self.headers["User-Agent"],
            "Accept": "application/json",
            "Origin": "https://rebang.today",
            "Referer": "https://rebang.today/",
        }

    async def fetch_weibo_tianapi(self) -> list[dict]:
        if not self.settings.tianapi_key:
            return []
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://apis.tianapi.com/weibohot/index",
                params={"key": self.settings.tianapi_key},
            )
            response.raise_for_status()
            payload = response.json()
        rows = payload.get("result", {}).get("list", []) or payload.get("newslist", [])
        return [
            {
                "platform": "weibo",
                "source_type": "tianapi",
                "title": row.get("word") or row.get("hotword") or row.get("title"),
                "rank": idx,
                "heat_score": float(row.get("hotwordnum") or row.get("hotValue") or 0),
                "url": row.get("url"),
                "category": row.get("label") or "微博热搜",
                "content_type": "hot_topic",
            }
            for idx, row in enumerate(rows, start=1)
            if row.get("word") or row.get("hotword") or row.get("title")
        ]

    async def fetch_platform(self, platform: str) -> list[dict]:
        if platform == "weibo":
            return await self.fetch_weibo_tianapi()
        return []

    def fetch_tophub_platform(self, platform: str) -> list[dict]:
        url = TOPHUB_SOURCES.get(platform)
        if not url:
            return []
        try:
            with httpx.Client(timeout=12, follow_redirects=True, headers=self.headers) as client:
                response = client.get(url)
                response.raise_for_status()
        except httpx.HTTPError:
            return []
        if "安全验证" in response.text or "captcha" in response.text.lower():
            return []
        return parse_tophub_html(response.text, platform, url)

    def fetch_rebang_platform(self, platform: str) -> list[dict]:
        source = REBANG_SOURCES.get(platform)
        if not source:
            return []
        params = f"{source['query']}&page=1&version={source['version']}"
        try:
            with httpx.Client(timeout=12, follow_redirects=True, headers=self.rebang_headers) as client:
                response = client.get(f"https://api.rebang.today/v1/items?{params}")
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError):
            return []
        if payload.get("code") != 200:
            return []
        rows = payload.get("data", {}).get("list") or "[]"
        try:
            items = __import__("json").loads(rows)
        except ValueError:
            return []
        return parse_rebang_items(items, platform, source["url"])


def parse_rebang_items(items: list[dict], platform: str, source_url: str) -> list[dict]:
    rows = []
    for idx, item in enumerate(items, start=1):
        title = _clean_title(item.get("title") or "")
        if not title:
            continue
        heat_score = (
            item.get("heat_num")
            or item.get("view")
            or item.get("view_num")
            or item.get("heat_str")
            or item.get("label_str")
        )
        rows.append(
            {
                "platform": platform,
                "source_type": "api",
                "title": title,
                "rank": idx,
                "heat_score": _heat_to_float(heat_score) or max(1000, 1600000 - idx * 18000),
                "url": _rebang_item_url(item, platform, source_url),
                "category": "热点话题",
                "author_name": item.get("author") or item.get("owner_name") or item.get("username"),
                "content_type": "hot_topic",
                "view_count": _heat_to_int(item.get("view") or item.get("view_num")),
                "like_count": _heat_to_int(item.get("like_count")),
                "comment_count": _heat_to_int(item.get("comment_count")),
                "share_count": _heat_to_int(item.get("share_count")),
                "danmaku_count": _heat_to_int(item.get("danmaku")),
            }
        )
    return rows[:50]


def _rebang_item_url(item: dict, platform: str, source_url: str) -> str:
    if item.get("www_url"):
        return item["www_url"]
    if platform == "bilibili" and item.get("bvid"):
        return f"https://www.bilibili.com/video/{item['bvid']}"
    if platform == "douyin" and item.get("aweme_id"):
        return f"https://www.douyin.com/video/{item['aweme_id']}"
    return source_url


def parse_tophub_html(html: str, platform: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows = _parse_table_rows(soup, platform)
    if not rows:
        rows = _parse_rank_links(soup, platform)
    clean_rows = []
    seen = set()
    for idx, row in enumerate(rows, start=1):
        title = _clean_title(row.get("title") or "")
        if len(title) < 2 or title in seen:
            continue
        seen.add(title)
        rank = row.get("rank") or idx
        heat_score = row.get("heat_score")
        synthetic_heat = max(1000, 1500000 - rank * 18000)
        heat_score = max(heat_score or 0, synthetic_heat)
        clean_rows.append(
            {
                "platform": platform,
                "source_type": "api",
                "title": title,
                "rank": rank,
                "heat_score": heat_score,
                "url": urljoin(source_url, row.get("url") or source_url),
                "category": "热点话题",
                "content_type": "hot_topic",
            }
        )
    return clean_rows[:50]


def _parse_table_rows(soup: BeautifulSoup, platform: str) -> list[dict]:
    rows = []
    for tr in soup.select("table tr"):
        cells = [cell.get_text(" ", strip=True) for cell in tr.select("td,th")]
        if len(cells) < 2:
            continue
        rank = _to_int(cells[0])
        title = cells[1]
        heat = _extract_heat(" ".join(cells[2:]))
        link = tr.select_one("a[href]")
        rows.append({"rank": rank, "title": title, "heat_score": heat, "url": link.get("href") if link else None})
    return rows


def _parse_rank_links(soup: BeautifulSoup, platform: str) -> list[dict]:
    rows = []
    candidates = soup.select(".cc-cd-cb-l a[href], .cc-cd-cb-ll a[href], .al a[href], a[href]")
    for link in candidates:
        text = link.get_text(" ", strip=True)
        if not text or any(word in text for word in ["今日热榜", "登录", "注册", "联系", "广告", "历史归档"]):
            continue
        rank = _to_int(text)
        title = text
        title_node = link.select_one(".t, .title, .item-title")
        if title_node:
            title = title_node.get_text(" ", strip=True)
        else:
            title = re.sub(r"^\s*\d+\s*", "", title)
            title = re.sub(r"\s+\d+(\.\d+)?[万亿]?(热度|阅读|讨论|播放|浏览)?\s*$", "", title)
        rows.append({"rank": rank, "title": title, "heat_score": _extract_heat(text), "url": link.get("href")})
    return rows


def _clean_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"^\d+\s*", "", title)
    return title[:120]


def _to_int(text: str | None) -> int | None:
    if not text:
        return None
    match = re.search(r"\d+", text)
    return int(match.group(0)) if match else None


def _extract_heat(text: str | None) -> float | None:
    if not text:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)\s*([wW万亿]?)", text.replace(",", ""))
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit in ("万", "w"):
        value *= 10000
    elif unit == "亿":
        value *= 100000000
    return value


def _heat_to_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return _extract_heat(str(value))


def _heat_to_int(value: object) -> int | None:
    number = _heat_to_float(value)
    return int(number) if number is not None else None
