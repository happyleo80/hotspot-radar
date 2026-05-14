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

export type AuthUser = {
  open_id?: string;
  union_id?: string;
  name: string;
  avatar_url?: string | null;
  email?: string | null;
};

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

const TOKEN_KEY = "hotspot_radar_auth_token";

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const API_BASE = getApiBase();
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (res.status === 401) {
    clearAuthToken();
    throw new Error("AUTH_REQUIRED");
  }
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
  brief: () => request<{ markdown: string }>("/api/ai/generate-brief", { method: "POST" }),
  authConfig: () => request<{ auth_required: boolean; feishu_configured: boolean }>("/api/auth/config"),
  me: () => request<{ authenticated: boolean; user: AuthUser }>("/api/auth/me"),
  loginUrl: (frontendRedirect: string) => request<{ url: string }>(`/api/auth/login-url?frontend_redirect=${encodeURIComponent(frontendRedirect)}`)
};
