export type Analysis = {
  id: number;
  summary: string;
  why_it_trends: string;
  sentiment: string;
  risk_level: string;
  marketing_value: string;
  suitable_industries: string;
  unsuitable_industries: string;
  marketing_angles: string;
  content_ideas: string;
  risk_notes: string;
  created_at: string;
};

export type Topic = {
  id: number;
  platform: string;
  source_type: string;
  title: string;
  normalized_title: string;
  rank: number | null;
  heat_score: number | null;
  url: string | null;
  category: string | null;
  author_name?: string | null;
  content_type?: string | null;
  collected_at: string;
  first_seen_at: string;
  last_seen_at: string;
  analyses: Analysis[];
  metrics?: Array<{ rank: number | null; heat_score: number | null; collected_at: string }>;
};

export type Resonance = {
  normalized_title: string;
  title: string;
  platforms: string[];
  platform_count: number;
  max_heat_score: number;
  topics: Topic[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  topics: (platform?: string) => request<Topic[]>(`/api/topics${platform ? `?platform=${platform}` : ""}`),
  topic: (id: string) => request<Topic>(`/api/topics/${id}`),
  resonance: () => request<Resonance[]>("/api/topics/resonance"),
  rising: () => request<Topic[]>("/api/topics/rising"),
  highValue: () => request<Topic[]>("/api/topics/high-value"),
  highRisk: () => request<Topic[]>("/api/topics/high-risk"),
  collectAll: () => request<{ total: number; platforms: Array<{ platform: string; count: number; source: string }> }>("/api/jobs/collect", { method: "POST" }),
  analyze: (id: number) => request<Analysis>(`/api/ai/analyze/topic/${id}`, { method: "POST" }),
  brief: () => request<{ markdown: string }>("/api/ai/generate-brief", { method: "POST" })
};
