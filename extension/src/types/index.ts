export type Platform = "weibo" | "douyin" | "xiaohongshu" | "zhihu" | "bilibili" | "unknown";

export type ExtractedItem = {
  title: string;
  url?: string;
  rank?: number;
  heat_score?: number;
  category?: string;
  author_name?: string;
  content_type?: string;
};

export type ExtractResult = {
  platform: Platform;
  page_url: string;
  items: ExtractedItem[];
};
