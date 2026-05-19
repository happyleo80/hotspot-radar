"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BrainCircuit, ChartNoAxesColumnIncreasing, Database, KeyRound, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSettings, AiUsage, api, PermissionOptions, TopicRecommendation, UserAccount } from "@/lib/api";

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminContent />
    </AuthGate>
  );
}

function AdminContent() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [permissionOptions, setPermissionOptions] = useState<PermissionOptions | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<number, { role: string; permissions: string[] }>>({});
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://api.deepseek.com");
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");
  const [embeddingProvider, setEmbeddingProvider] = useState("mock");
  const [embeddingKey, setEmbeddingKey] = useState("");
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState("https://open.bigmodel.cn/api/paas/v4/embeddings");
  const [embeddingModel, setEmbeddingModel] = useState("embedding-3");
  const [embeddingDimension, setEmbeddingDimension] = useState(1024);
  const [embeddingEnabled, setEmbeddingEnabled] = useState(false);
  const [embeddingTestText, setEmbeddingTestText] = useState("用生活方式替代产品参数表达");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [userRows, usageRows, recRows, settingsRows, permissionRows] = await Promise.all([
      api.adminUsers(),
      api.adminUsage(),
      api.adminRecommendations(),
      api.adminSettings(),
      api.permissionOptions()
    ]);
    setUsers(userRows);
    setUsage(usageRows);
    setRecommendations(recRows);
    setSettings(settingsRows);
    setPermissionOptions(permissionRows);
    setPermissionDrafts(Object.fromEntries(userRows.map((user) => [user.id, { role: user.role || "viewer", permissions: splitPermissions(user.permissions) }])));
    setDeepseekBaseUrl(settingsRows.deepseek_base_url);
    setDeepseekModel(settingsRows.deepseek_model);
    setEmbeddingProvider(settingsRows.embedding_provider || "mock");
    setEmbeddingBaseUrl(settingsRows.embedding_base_url || "https://open.bigmodel.cn/api/paas/v4/embeddings");
    setEmbeddingModel(settingsRows.embedding_model || "embedding-3");
    setEmbeddingDimension(settingsRows.embedding_dimension || 1024);
    setEmbeddingEnabled(Boolean(settingsRows.embedding_enabled));
  }

  useEffect(() => {
    load().catch(() => setMessage("当前账号没有管理权限，或服务暂不可用。"));
  }, []);

  async function adjust(userId: number, delta: number) {
    await api.adjustPoints(userId, delta);
    await load();
  }

  async function saveSettings() {
    setBusy("settings");
    const result = await api.updateAdminSettings({
      deepseek_api_key: deepseekKey || undefined,
      deepseek_base_url: deepseekBaseUrl,
      deepseek_model: deepseekModel,
      embedding_provider: embeddingProvider,
      embedding_api_key: embeddingKey || undefined,
      embedding_base_url: embeddingBaseUrl,
      embedding_model: embeddingModel,
      embedding_dimension: Number(embeddingDimension) || 1024,
      embedding_enabled: embeddingEnabled
    });
    setSettings(result);
    setDeepseekKey("");
    setEmbeddingKey("");
    setMessage("AI 模型配置已保存。DeepSeek 负责策略生成，Embedding 负责语义记忆索引。");
    setBusy("");
  }

  async function testEmbedding() {
    setBusy("embedding-test");
    try {
      const result = await api.testEmbedding(embeddingTestText);
      setMessage(`Embedding 测试成功：${result.provider} / ${result.model}，返回 ${result.dimension} 维向量。`);
    } catch (error) {
      setMessage(`Embedding 测试失败：${error instanceof Error ? error.message : "请检查配置"}`);
    }
    setBusy("");
  }

  async function embedAllCases() {
    setBusy("embed-all");
    try {
      const result = await api.embedAllCases();
      setMessage(`批量向量化完成：共 ${result.total} 个案例，成功 ${result.embedded} 个，失败 ${result.failed} 个。`);
    } catch (error) {
      setMessage(`批量向量化失败：${error instanceof Error ? error.message : "请检查配置"}`);
    }
    setBusy("");
  }

  async function savePermissions(userId: number) {
    const draft = permissionDrafts[userId];
    if (!draft) return;
    setBusy(`permissions-${userId}`);
    await api.updateUserPermissions(userId, draft);
    setMessage("用户权限已更新，用户刷新页面后生效。");
    await load();
    setBusy("");
  }

  function updateRole(user: UserAccount, role: string) {
    const defaults = permissionOptions?.role_permissions[role] || [];
    setPermissionDrafts({ ...permissionDrafts, [user.id]: { role, permissions: defaults } });
  }

  function togglePermission(user: UserAccount, permission: string) {
    const draft = permissionDrafts[user.id] || { role: user.role || "viewer", permissions: splitPermissions(user.permissions) };
    const permissions = draft.permissions.includes(permission)
      ? draft.permissions.filter((item) => item !== permission)
      : [...draft.permissions, permission];
    setPermissionDrafts({ ...permissionDrafts, [user.id]: { ...draft, permissions } });
  }

  const pointTrend = buildPointTrend(usage);

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-6 text-slate-950">
      <section className="mx-auto w-full max-w-[1480px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"><ArrowLeft size={16} /> 返回工作台</Link>
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-[#dce7fb] bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(124,58,237,0.18),transparent_32%),linear-gradient(135deg,#f8fbff,#eef4ff_48%,#f9f5ff)] px-7 py-7 shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 shadow-sm"><ShieldCheck size={14} /> Admin Control Center</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal">管理后台</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">集中管理飞书用户权限、AI营销知识工作台授权、积分额度、AI 消耗和 Deepseek 模型配置，确保知识底座只被合适的人维护。</p>
            </div>
            <a className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700" href="/cases-admin">
              <Sparkles size={16} /> AI营销知识工作台
            </a>
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl border border-[#e4eaf3] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{message}</p>}

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Metric title="用户数" value={users.length} icon={<Users size={22} />} />
          <Metric title="AI 调用" value={usage.length} icon={<BrainCircuit size={22} />} />
          <Metric title="话题建议" value={recommendations.length} icon={<Sparkles size={22} />} />
          <Metric title="积分消耗" value={usage.reduce((sum, item) => sum + (item.points_used || 0), 0)} icon={<ChartNoAxesColumnIncreasing size={22} />} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound size={18} className="text-blue-600" /> DeepSeek 大模型配置</CardTitle>
              <p className="text-sm text-slate-500">用于案例结构化、热点营销建议和策略生成。</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                当前 Key：{settings?.deepseek_api_key_configured ? settings.deepseek_api_key_masked : "未配置"}
              </div>
              <label className="block text-xs font-medium text-slate-500">Deepseek API Key</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-blue-500"
                placeholder="sk-...，留空则不修改"
                value={deepseekKey}
                onChange={(event) => setDeepseekKey(event.target.value)}
                type="password"
              />
              <label className="block text-xs font-medium text-slate-500">Base URL</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-blue-500"
                value={deepseekBaseUrl}
                onChange={(event) => setDeepseekBaseUrl(event.target.value)}
              />
              <label className="block text-xs font-medium text-slate-500">模型</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-blue-500"
                value={deepseekModel}
                onChange={(event) => setDeepseekModel(event.target.value)}
              />
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveSettings} disabled={busy === "settings"}>保存配置</Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Database size={18} className="text-violet-600" /> Embedding 向量模型配置</CardTitle>
              <p className="text-sm text-slate-500">用于案例向量化、相似案例检索、热点匹配案例，以及未来图文 / Campaign / PPT 调用。</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">
                当前 Key：{settings?.embedding_api_key_configured ? settings.embedding_api_key_masked : "未配置"} · 状态：{embeddingEnabled ? "已启用" : "未启用"}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-slate-500">
                  Provider
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                    value={embeddingProvider}
                    onChange={(event) => setEmbeddingProvider(event.target.value)}
                  >
                    <option value="zhipu">zhipu</option>
                    <option value="xinference_bge_m3">xinference_bge_m3</option>
                    <option value="openai">openai</option>
                    <option value="mock">mock</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  启用状态
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                    value={embeddingEnabled ? "enabled" : "disabled"}
                    onChange={(event) => setEmbeddingEnabled(event.target.value === "enabled")}
                  >
                    <option value="enabled">enabled</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-500">Embedding API Key</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                placeholder="留空则不修改"
                value={embeddingKey}
                onChange={(event) => setEmbeddingKey(event.target.value)}
                type="password"
              />
              <label className="block text-xs font-medium text-slate-500">Base URL</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                value={embeddingBaseUrl}
                onChange={(event) => setEmbeddingBaseUrl(event.target.value)}
              />
              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <label className="block text-xs font-medium text-slate-500">
                  Model
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                    value={embeddingModel}
                    onChange={(event) => setEmbeddingModel(event.target.value)}
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Dimension
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                    value={embeddingDimension}
                    onChange={(event) => setEmbeddingDimension(Number(event.target.value) || 0)}
                    type="number"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-500">测试文本</label>
              <input
                className="h-10 w-full rounded-lg border border-[#dde4ef] bg-white px-3 text-sm outline-none focus:border-violet-500"
                value={embeddingTestText}
                onChange={(event) => setEmbeddingTestText(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveSettings} disabled={busy === "settings"}>保存配置</Button>
                <Button className="border border-[#dde4ef] bg-white text-slate-700 hover:bg-slate-50" onClick={testEmbedding} disabled={busy === "embedding-test"}>测试连接</Button>
                <Button className="border border-[#dde4ef] bg-white text-slate-700 hover:bg-slate-50" onClick={embedAllCases} disabled={busy === "embed-all"}>批量向量化高价值案例</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ChartNoAxesColumnIncreasing size={18} className="text-blue-600" /> 积分消耗趋势</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-52 items-end gap-2 border-b border-[#edf1f6] pb-2">
                {pointTrend.map((item) => (
                  <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-violet-400"
                      style={{ height: `${Math.max(6, item.percent)}%` }}
                      title={`${item.date}: ${item.points} 积分`}
                    />
                    <span className="w-full truncate text-center text-[10px] text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">按最近 14 天汇总 AI 使用积分消耗。</p>
            </CardContent>
          </Card>

        <Card className="mt-5 rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users size={18} className="text-blue-600" /> 用户权限管理</CardTitle>
            <p className="text-sm text-slate-500">为飞书用户分配角色、案例知识库权限和积分额度。</p>
          </CardHeader>
          <CardContent className="overflow-auto p-0">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="px-4 py-3">用户</th><th>Open ID</th><th>角色</th><th>案例知识库权限</th><th>积分</th><th>累计消耗</th><th>最近访问</th><th>操作</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[#edf1f6]">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-950">{user.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{user.email || "暂无邮箱"}</p>
                    </td>
                    <td className="max-w-[220px] truncate">{user.open_id}</td>
                    <td className="align-top">
                      <select
                        className="h-9 rounded-lg border border-[#dde4ef] bg-white px-2 text-xs outline-none focus:border-blue-500"
                        value={permissionDrafts[user.id]?.role || user.role || "viewer"}
                        onChange={(event) => updateRole(user, event.target.value)}
                      >
                        {(permissionOptions?.roles || ["viewer", "analyst", "contributor", "reviewer", "admin", "super_admin"]).map((role) => <option key={role} value={role}>{roleName(role)}</option>)}
                      </select>
                    </td>
                    <td className="max-w-[420px] py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {casePermissionKeys(permissionOptions).map((permission) => {
                          const checked = (permissionDrafts[user.id]?.permissions || splitPermissions(user.permissions)).includes(permission);
                          return (
                            <button
                              key={permission}
                              className={`rounded-full px-2 py-1 text-xs ${checked ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                              onClick={() => togglePermission(user, permission)}
                              type="button"
                            >
                              {permissionOptions?.permission_labels[permission] || permission}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="align-top">{user.points_balance}</td>
                    <td className="align-top">{user.total_points_used}</td>
                    <td className="align-top">{new Date(user.last_seen_at).toLocaleString()}</td>
                    <td className="flex flex-wrap gap-2 py-2 align-top">
                      <button className="rounded-lg border border-[#dde4ef] px-2 py-1 text-xs hover:bg-slate-50" onClick={() => adjust(user.id, 100)}>+100</button>
                      <button className="rounded-lg border border-[#dde4ef] px-2 py-1 text-xs hover:bg-slate-50" onClick={() => adjust(user.id, -100)}>-100</button>
                      <button className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100" onClick={() => savePermissions(user.id)} disabled={busy === `permissions-${user.id}`}>保存权限</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">AI 消耗记录</CardTitle></CardHeader>
            <CardContent className="max-h-[420px] overflow-auto p-0">
              {usage.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#edf1f6] px-4 py-3 text-sm">
                  <span>{item.action} / {item.target_type} #{item.target_id ?? "-"}</span>
                  <span className="text-slate-500">{item.points_used} 积分</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
            <CardHeader><CardTitle className="text-base">AI 按钮数据</CardTitle></CardHeader>
            <CardContent className="max-h-[420px] overflow-auto p-0">
              {recommendations.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#edf1f6] px-4 py-3 text-sm">
                  <span className="line-clamp-1">{item.prompt_topic}</span>
                  <span className="text-slate-500">{item.points_used} 积分</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-3xl font-semibold text-transparent">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function splitPermissions(value?: string | null) {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function roleName(role: string) {
  const names: Record<string, string> = {
    viewer: "普通用户",
    analyst: "分析查看者",
    contributor: "案例贡献者",
    reviewer: "案例审核者",
    admin: "管理员",
    super_admin: "超级管理员",
  };
  return names[role] || role;
}

function casePermissionKeys(options: PermissionOptions | null) {
  const preferred = ["case_view", "case_upload", "case_structure", "case_edit", "case_review", "case_embed", "tag_manage", "case_delete", "admin_access", "user_manage", "settings_manage"];
  const available = options ? Object.keys(options.permission_labels) : preferred;
  return preferred.filter((item) => available.includes(item));
}

function buildPointTrend(usage: AiUsage[]) {
  const days: Array<{ date: string; label: string; points: number }> = [];
  const now = new Date();
  for (let index = 13; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, label: `${date.getMonth() + 1}/${date.getDate()}`, points: 0 });
  }
  const byDate = new Map(days.map((item) => [item.date, item]));
  usage.forEach((item) => {
    const date = new Date(item.created_at).toISOString().slice(0, 10);
    const row = byDate.get(date);
    if (row) row.points += item.points_used || 0;
  });
  const max = Math.max(1, ...days.map((item) => item.points));
  return days.map((item) => ({ ...item, percent: Math.round((item.points / max) * 100) }));
}
