import type { ExtractedItem, Platform } from "../../types";

export function visibleTextItems(platform: Platform, selectors: string[]): ExtractedItem[] {
  const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
  const seen = new Set<string>();
  const items: ExtractedItem[] = [];
  nodes.forEach((node) => {
    if (!isVisible(node)) return;
    const title = normalize(node.innerText || node.textContent || "");
    if (title.length < 2 || title.length > 80 || seen.has(title)) return;
    seen.add(title);
    const anchor = node.closest("a") || node.querySelector("a");
    items.push({
      title,
      url: anchor instanceof HTMLAnchorElement ? anchor.href : location.href,
      rank: items.length + 1,
      content_type: "visible_dom_item",
      category: platform
    });
  });
  return items.slice(0, 30);
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").replace(/(热|荐|广告)$/g, "").trim();
}

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}
