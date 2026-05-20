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
  latest_recommendation?: TopicRecommendation | null;
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

export type MarketingCase = {
  id: number;
  source: string;
  source_url: string;
  source_title?: string | null;
  title: string;
  summary?: string | null;
  brand?: string | null;
  industry?: string | null;
  published_at?: string | null;
  fetched_at: string;
  analyzed_at?: string | null;
  creativity?: string | null;
  target_audience?: string | null;
  execution_highlights?: string | null;
  communication_effect?: string | null;
  reusable_methods?: string | null;
  tags?: string | null;
  raw_text?: string | null;
  raw_material_id?: number | null;
  source_category: string;
  platform?: string | null;
  pipeline_stage: string;
  structure_status: string;
  review_status: string;
  reference_value: string;
  knowledge_score: number;
  structured_json?: string | null;
  ai_core_insight?: string | null;
  why_it_worked?: string | null;
  strategy_patterns?: string | null;
  emotional_mechanisms?: string | null;
  marketing_model?: string | null;
  marketing_model_definition?: string | null;
  marketing_model_confidence?: number | null;
  sub_models?: string | null;
  user_psychology_insights?: string | null;
  content_structure_model?: string | null;
  reusable_strategy_template?: string | null;
  knowledge_level?: string | null;
  suitable_industries?: string | null;
  unsuitable_industries?: string | null;
  platform_strategy?: string | null;
  industry_tags?: string | null;
  platform_tags?: string | null;
  strategy_tags?: string | null;
  emotion_tags?: string | null;
  risk_points?: string | null;
  suitable_for?: string | null;
  not_suitable_for?: string | null;
  repeatable_patterns?: string | null;
  embedding_status: string;
  embedding_keywords?: string | null;
  embedding_error?: string | null;
  embedding_dimension?: number | null;
  rag_enabled: number;
  callable_by_hotspot: number;
  callable_by_content: number;
  callable_by_campaign: number;
  callable_by_ppt: number;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  embedded_at?: string | null;
  last_called_at?: string | null;
  call_count: number;
  feedback_score?: number | null;
  related_topics?: string | null;
  updated_at?: string | null;
};

export type CaseRawMaterial = {
  id: number;
  source_type: string;
  source_url?: string | null;
  raw_title: string;
  raw_text?: string | null;
  file_url?: string | null;
  created_at: string;
  processing_status: string;
};

export type SimilarCase = {
  case: MarketingCase;
  score: number;
  reasons: string[];
};

export type RelatedTopic = {
  id: number;
  title: string;
  platform: string;
  score: number;
  reasons: string[];
};

export type UserAccount = {
  id: number;
  open_id: string;
  union_id?: string | null;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  role: string;
  permissions?: string | null;
  points_balance: number;
  total_points_used: number;
  created_at: string;
  last_seen_at: string;
};

export type PermissionOptions = {
  roles: string[];
  role_permissions: Record<string, string[]>;
  permission_labels: Record<string, string>;
};

export type TopicRecommendation = {
  id: number;
  user_id: number;
  topic_id: number;
  case_id?: number | null;
  prompt_topic: string;
  recommendation: string;
  points_used: number;
  model: string;
  created_at: string;
  case_refs?: TopicRecommendationCaseRef[];
};

export type TopicRecommendationCaseRef = {
  id: number;
  recommendation_id: number;
  case_id: number;
  match_score: number;
  match_reason?: string | null;
  used_insight?: string | null;
  created_at: string;
};

export type AiUsage = {
  id: number;
  user_id?: number | null;
  action: string;
  target_type: string;
  target_id?: number | null;
  model: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  points_used: number;
  created_at: string;
};

export type AdminSettings = {
  deepseek_api_key_configured: boolean;
  deepseek_api_key_masked: string;
  deepseek_base_url: string;
  deepseek_model: string;
  embedding_provider: string;
  embedding_api_key_configured: boolean;
  embedding_api_key_masked: string;
  embedding_base_url: string;
  embedding_model: string;
  embedding_dimension: number;
  embedding_enabled: boolean;
};

function getApiBase() {
  if (typeof window !== "undefined") {
    const configured = process.env.NEXT_PUBLIC_API_BASE;
    if (configured) {
      try {
        const configuredUrl = new URL(configured);
        const browserHost = window.location.hostname;
        const configuredIsLocal = ["localhost", "127.0.0.1", "::1"].includes(configuredUrl.hostname);
        const browserIsLocal = ["localhost", "127.0.0.1", "::1"].includes(browserHost);
        if (!configuredIsLocal || browserIsLocal) return configured;
      } catch {
        return configured;
      }
    }
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch (error) {
    throw new Error(`API_UNREACHABLE:${API_BASE}`);
  }
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
  recommend: (id: number) => request<TopicRecommendation>(`/api/ai/recommend/topic/${id}`, { method: "POST" }),
  brief: () => request<{ markdown: string }>("/api/ai/generate-brief", { method: "POST" }),
  authConfig: () => request<{ auth_required: boolean; feishu_configured: boolean }>("/api/auth/config"),
  me: () => request<{ authenticated: boolean; user: AuthUser }>("/api/auth/me"),
  loginUrl: (frontendRedirect: string) => request<{ url: string }>(`/api/auth/login-url?frontend_redirect=${encodeURIComponent(frontendRedirect)}`),
  adminLogin: (payload: { username: string; password: string }) =>
    request<{ auth_token: string; user: AuthUser }>("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  account: () => request<UserAccount>("/api/users/me"),
  myPermissions: () => request<{ role: string; permissions: string[] }>("/api/users/me/permissions"),
  myRecommendations: () => request<TopicRecommendation[]>("/api/users/me/recommendations"),
  myUsage: () => request<AiUsage[]>("/api/users/me/usage"),
  cases: () => request<MarketingCase[]>("/api/cases"),
  caseDetail: (id: string | number) => request<MarketingCase>(`/api/cases/${id}`),
  rawMaterials: () => request<CaseRawMaterial[]>("/api/cases/raw-materials"),
  createRawMaterial: (payload: { source_type: string; source_url?: string; raw_title: string; raw_text?: string; file_url?: string }) =>
    request<CaseRawMaterial>("/api/cases/raw-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  updateCase: (id: number, payload: Partial<MarketingCase>) =>
    request<MarketingCase>(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  structureCase: (id: number) => request<MarketingCase>(`/api/cases/${id}/structure`, { method: "POST" }),
  approveCase: (id: number) => request<MarketingCase>(`/api/cases/${id}/approve`, { method: "POST" }),
  rerunCase: (id: number) => request<MarketingCase>(`/api/cases/${id}/rerun`, { method: "POST" }),
  embedCase: (id: number) => request<MarketingCase>(`/api/cases/${id}/embed`, { method: "POST" }),
  embedAllCases: () => request<{ total: number; embedded: number; failed: number }>("/api/cases/embed-all", { method: "POST" }),
  similarCases: (id: number) => request<SimilarCase[]>(`/api/cases/${id}/similar`),
  relatedTopicsForCase: (id: number) => request<RelatedTopic[]>(`/api/cases/${id}/related-topics`),
  ragSearch: (topicId: number) => request<{ topic_id: number; topic_title: string; matches: SimilarCase[] }>(`/api/cases/rag/search?topic_id=${topicId}`),
  importCases: (limit = 100) => request<{ fetched: number; created: number; updated: number; analyzed: number }>(`/api/cases/import-digitaling?limit=${limit}`, { method: "POST" }),
  adminUsers: () => request<UserAccount[]>("/api/users/admin/users"),
  adminUsage: () => request<AiUsage[]>("/api/users/admin/usage"),
  adminRecommendations: () => request<TopicRecommendation[]>("/api/users/admin/recommendations"),
  adminSettings: () => request<AdminSettings>("/api/users/admin/settings"),
  permissionOptions: () => request<PermissionOptions>("/api/users/admin/permission-options"),
  updateUserPermissions: (userId: number, payload: { role: string; permissions: string[] }) =>
    request<UserAccount>(`/api/users/admin/users/${userId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  updateAdminSettings: (payload: {
    deepseek_api_key?: string;
    deepseek_base_url?: string;
    deepseek_model?: string;
    embedding_provider?: string;
    embedding_api_key?: string;
    embedding_base_url?: string;
    embedding_model?: string;
    embedding_dimension?: number;
    embedding_enabled?: boolean;
  }) =>
    request<AdminSettings>("/api/users/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  testEmbedding: (text: string) =>
    request<{ ok: boolean; provider: string; model: string; dimension: number }>("/api/users/admin/settings/embedding/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }),
  adjustPoints: (userId: number, pointsDelta: number) =>
    request<UserAccount>(`/api/users/admin/users/${userId}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points_delta: pointsDelta })
    })
};
