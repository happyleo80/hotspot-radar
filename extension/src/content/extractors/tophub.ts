import type { ExtractedItem, Platform } from "../../types";

const nodePlatformMap: Record<string, Platform> = {
  mproPpoq6O: "zhihu",
  KqndgxeLl9: "weibo",
  "74KvxwokxM": "bilibili",
  DpQvNABoNE: "douyin",
  L4MdA5ldxD: "xiaohongshu"
};

export function detectTophubPlatform(pathname = location.pathname): Platform {
  const nodeId = pathname.split("/").filter(Boolean).pop() || "";
  return nodePlatformMap[nodeId] || "unknown";
}

export function extractTophub(platform: Platform): ExtractedItem[] {
  const rows = Array.from(document.querySelectorAll<HTMLElement>("table tr, .cc-cd-cb-l, .cc-cd-cb-ll, .al li, .jc-c"));
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();

  rows.forEach((row) => {
    if (!isVisible(row)) return;
    const text = normalize(row.innerText || row.textContent || "");
    if (!text || text.includes("安全验证")) return;

    const link = row.querySelector<HTMLAnchorElement>("a[href]");
    const titleNode = row.querySelector<HTMLElement>(".t, .title, .item-title, a[href]");
    const rawTitle = titleNode?.innerText || link?.innerText || text;
    const title = cleanTitle(rawTitle);
    if (title.length < 2 || title.length > 100 || seen.has(title)) return;

    seen.add(title);
    items.push({
      title,
      url: link?.href || location.href,
      rank: extractRank(text) || items.length + 1,
      heat_score: extractHeat(text),
      category: "TopHub 热榜",
      content_type: "hot_topic"
    });
  });

  if (items.length > 0) return items.slice(0, 50);
  return fallbackLinks(platform);
}

function fallbackLinks(platform: Platform): ExtractedItem[] {
  const seen = new Set<string>();
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .filter((link) => isVisible(link))
    .map((link, index) => ({
      title: cleanTitle(link.innerText || link.textContent || ""),
      url: link.href,
      rank: index + 1,
      category: "TopHub 热榜",
      content_type: "hot_topic"
    }))
    .filter((item) => {
      if (item.title.length < 2 || item.title.length > 100 || seen.has(item.title)) return false;
      if (["今日热榜", "登录", "注册", "广告", "安全验证"].some((word) => item.title.includes(word))) return false;
      seen.add(item.title);
      return platform !== "unknown";
    })
    .slice(0, 50);
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function cleanTitle(text: string) {
  return normalize(text)
    .replace(/^\d+\s*/, "")
    .replace(/\s+\d+(\.\d+)?[万亿]?(热度|阅读|讨论|播放|浏览)?\s*$/, "")
    .slice(0, 120);
}

function extractRank(text: string) {
  const match = text.match(/^\s*(\d{1,3})\b/);
  return match ? Number(match[1]) : undefined;
}

function extractHeat(text: string) {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([万亿]?)(热度|阅读|讨论|播放|浏览)?/);
  if (!match) return undefined;
  let value = Number(match[1]);
  if (match[2] === "万") value *= 10000;
  if (match[2] === "亿") value *= 100000000;
  return Number.isFinite(value) ? value : undefined;
}

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}
