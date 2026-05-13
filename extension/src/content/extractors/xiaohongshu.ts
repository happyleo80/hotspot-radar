import { visibleTextItems } from "./shared";

export function extractXiaohongshu() {
  return visibleTextItems("xiaohongshu", [
    "a[href*='/search_result']",
    "a[href*='/explore']",
    ".note-item",
    "section a"
  ]);
}
