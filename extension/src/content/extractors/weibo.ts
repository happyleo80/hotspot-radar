import { visibleTextItems } from "./shared";

export function extractWeibo() {
  return visibleTextItems("weibo", [
    "a[href*='weibo.com/search']",
    "[class*='HotSearch'] a",
    "[class*='hot'] a",
    "main a"
  ]);
}
