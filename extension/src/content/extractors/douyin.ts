import { visibleTextItems } from "./shared";

export function extractDouyin() {
  return visibleTextItems("douyin", [
    "a[href*='/hot']",
    "a[href*='/search']",
    "[data-e2e*='hot']",
    "main a"
  ]);
}
