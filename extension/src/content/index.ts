import { extractBilibili } from "./extractors/bilibili";
import { extractDouyin } from "./extractors/douyin";
import { extractWeibo } from "./extractors/weibo";
import { extractXiaohongshu } from "./extractors/xiaohongshu";
import { extractZhihu } from "./extractors/zhihu";
import { detectTophubPlatform, extractTophub } from "./extractors/tophub";
import type { ExtractResult, Platform } from "../types";

function detectPlatform(host = location.hostname): Platform {
  if (host.includes("tophub.today")) return detectTophubPlatform();
  if (host.includes("weibo.com")) return "weibo";
  if (host.includes("douyin.com")) return "douyin";
  if (host.includes("xiaohongshu.com")) return "xiaohongshu";
  if (host.includes("zhihu.com")) return "zhihu";
  if (host.includes("bilibili.com")) return "bilibili";
  return "unknown";
}

function extract(): ExtractResult {
  const platform = detectPlatform();
  const items =
    location.hostname.includes("tophub.today") ? extractTophub(platform) :
    platform === "weibo" ? extractWeibo() :
    platform === "douyin" ? extractDouyin() :
    platform === "xiaohongshu" ? extractXiaohongshu() :
    platform === "zhihu" ? extractZhihu() :
    platform === "bilibili" ? extractBilibili() : [];

  return { platform, page_url: location.href, items };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "HOTSPOT_RADAR_EXTRACT") {
    sendResponse(extract());
  }
  return true;
});
