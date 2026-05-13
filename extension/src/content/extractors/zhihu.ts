import { visibleTextItems } from "./shared";

export function extractZhihu() {
  return visibleTextItems("zhihu", [
    ".HotItem-title",
    "a[href*='/question/']",
    ".TopstoryItem a",
    "main a"
  ]);
}
