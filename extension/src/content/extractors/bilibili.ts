import { visibleTextItems } from "./shared";

export function extractBilibili() {
  return visibleTextItems("bilibili", [
    ".rank-item .title",
    "a[href*='bilibili.com/video']",
    ".video-name",
    "main a"
  ]);
}
