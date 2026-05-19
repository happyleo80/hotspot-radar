"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Database, FileText, Network, RefreshCw, Save, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, MarketingCase, RelatedTopic, SimilarCase } from "@/lib/api";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  return (
    <AuthGate>
      <CaseDetail caseId={params.id} />
    </AuthGate>
  );
}

function CaseDetail({ caseId }: { caseId: string }) {
  const [item, setItem] = useState<MarketingCase | null>(null);
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<RelatedTopic[]>([]);
  const [draft, setDraft] = useState<Partial<MarketingCase>>({});
  const [busy, setBusy] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const structured = useMemo(() => {
    if (!item?.structured_json) return null;
    try {
      return JSON.parse(item.structured_json);
    } catch {
      return null;
    }
  }, [item]);
  const platformStrategy = useMemo(() => parsePlatformStrategy(item?.platform_strategy), [item?.platform_strategy]);
  const strategyTemplate = useMemo(() => parseStrategyTemplate(item?.reusable_strategy_template), [item?.reusable_strategy_template]);

  async function load() {
    const permissionRows = await api.myPermissions();
    setPermissions(permissionRows.permissions);
    const row = await api.caseDetail(caseId);
    setItem(row);
    setDraft(row);
    const [similarRows, topicRows] = await Promise.all([
      api.similarCases(row.id).catch(() => []),
      api.relatedTopicsForCase(row.id).catch(() => [])
    ]);
    setSimilarCases(similarRows);
    setRelatedTopics(topicRows);
  }

  useEffect(() => {
    load().catch(() => {
      setItem(null);
      setError("暂无案例知识库权限，请联系管理员在管理后台开通。");
    });
  }, [caseId]);

  async function save() {
    if (!item) return;
    setBusy("save");
    setItem(await api.updateCase(item.id, draft));
    setBusy("");
  }

  async function structure() {
    if (!item) return;
    setBusy("structure");
    setItem(await api.structureCase(item.id));
    setBusy("");
  }

  async function approve() {
    if (!item) return;
    setBusy("approve");
    setItem(await api.approveCase(item.id));
    setBusy("");
  }

  async function embed() {
    if (!item) return;
    setBusy("embed");
    const row = await api.embedCase(item.id);
    setItem(row);
    setDraft(row);
    const [similarRows, topicRows] = await Promise.all([
      api.similarCases(row.id).catch(() => []),
      api.relatedTopicsForCase(row.id).catch(() => [])
    ]);
    setSimilarCases(similarRows);
    setRelatedTopics(topicRows);
    setBusy("");
  }

  async function rerun() {
    if (!item) return;
    setBusy("rerun");
    setItem(await api.rerunCase(item.id));
    setBusy("");
  }

  if (!item) {
    return <main className="min-h-screen bg-[#f7f9fc] p-6 text-sm text-slate-500">{error || "正在加载案例详情..."}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-6 text-slate-950">
      <section className="mx-auto max-w-[1480px]">
        <Link href="/cases-admin" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"><ArrowLeft size={16} /> 返回案例生产中心</Link>
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-[#dce7fb] bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(124,58,237,0.18),transparent_28%),linear-gradient(135deg,#f8fbff,#eef4ff_52%,#f9f5ff)] px-7 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-blue-600"><BrainCircuit size={14} /> {stageName(item.pipeline_stage)} / {reviewName(item.review_status)}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal">{item.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Badge>{item.industry || "未分类"}</Badge>
            <Badge>{knowledgeLevel(item)}</Badge>
            <Badge>AI策略价值 {item.knowledge_score || 0}</Badge>
            <Badge>{item.rag_enabled ? "RAG 已启用" : "待加入 RAG"}</Badge>
            <Badge>{embeddingLabel(item)}</Badge>
          </div>
          {item.embedding_error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">向量化失败原因：{item.embedding_error}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <CallableSystems item={item} />
          <Lifecycle item={item} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {hasPermission(permissions, "case_structure") ? <Button className="bg-blue-600 hover:bg-blue-700" onClick={structure} disabled={busy === "structure"}><Sparkles size={16} /> AI提炼规律</Button> : null}
          {hasPermission(permissions, "case_structure") ? <Button className="bg-white text-blue-600 hover:bg-blue-50" onClick={rerun} disabled={busy === "rerun"}><RefreshCw size={16} /> 重新理解案例</Button> : null}
          {hasPermission(permissions, "case_review") ? <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={approve} disabled={busy === "approve"}><Database size={16} /> 加入高价值案例</Button> : null}
          {hasPermission(permissions, "case_embed") ? <Button className="bg-violet-600 hover:bg-violet-700" onClick={embed} disabled={busy === "embed"}><Network size={16} /> 加入热点策略库</Button> : null}
          {hasPermission(permissions, "case_embed") ? <Button className="bg-white text-violet-700 hover:bg-violet-50" onClick={embed} disabled={busy === "embed"}><Database size={16} /> 重新向量化</Button> : null}
          {hasPermission(permissions, "case_edit") ? <Button className="bg-slate-950 hover:bg-slate-800" onClick={save} disabled={busy === "save"}><Save size={16} /> 保存人工修正</Button> : null}
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5">
            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold"><FileText size={18} /> 原始案例素材</h2>
                <p className="mt-3 text-sm text-slate-500">来源链接</p>
                {item.source_url ? <a className="mt-1 block break-all text-sm text-blue-600" href={item.source_url} target="_blank">{item.source_url}</a> : <p className="text-sm text-slate-400">暂无</p>}
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <Info label="来源平台" value={item.platform || item.platform_tags || "网页/行业媒体"} />
                  <Info label="原始发布时间" value={item.published_at ? new Date(item.published_at).toLocaleDateString() : "未知"} />
                  <Info label="附件预览" value={item.raw_material_id ? `素材 #${item.raw_material_id}` : "暂无附件"} />
                  <Info label="来源类型" value={item.source_category || "crawled"} />
                </div>
                <p className="mt-5 text-sm text-slate-500">原始正文</p>
                <div className="mt-2 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-7 text-slate-700">{item.raw_text || item.summary || "暂无原始正文"}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">相似案例</h2>
                <div className="mt-4 space-y-3">
                  {similarCases.length ? similarCases.map((row) => (
                    <a key={row.case.id} href={`/cases-admin/${row.case.id}`} className="block rounded-xl border border-[#edf1f6] p-3 hover:border-blue-200">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-medium">{row.case.title}</p>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">{Math.round(row.score)}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                        <p><span className="font-medium text-slate-700">相似原因：</span>{row.reasons.join(" / ") || "都具备可复用传播结构。"}</p>
                        <p><span className="font-medium text-slate-700">共同模型：</span>{row.case.marketing_model || item.marketing_model || "情绪价值传播模型"}</p>
                        <p><span className="font-medium text-slate-700">共同情绪：</span>{sharedText(row.case.emotional_mechanisms || row.case.emotion_tags, item.emotional_mechanisms || item.emotion_tags)}</p>
                        <p><span className="font-medium text-slate-700">共同结构：</span>{sharedText(row.case.content_structure_model, item.content_structure_model)}</p>
                      </div>
                    </a>
                  )) : <p className="text-sm text-slate-500">暂无相似案例。可先点击“一键加入 RAG 知识库”。</p>}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">可关联热点</h2>
                <div className="mt-4 space-y-3">
                  {relatedTopics.length ? relatedTopics.map((topic) => (
                    <a key={topic.id} href={`/topics/${topic.id}`} className="block rounded-xl border border-[#edf1f6] p-3 hover:border-blue-200">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-medium">{topic.title}</p>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-600">{Math.round(topic.score)}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                        <p>{platformName(topic.platform)} / 适配度 {Math.round(topic.score)}</p>
                        <p><span className="font-medium text-slate-700">AI关联原因：</span>{topic.reasons.join(" / ") || "与案例具有相似情绪机制和传播模型。"}</p>
                        <p><span className="font-medium text-slate-700">推荐玩法：</span>{topicPlay(topic.platform)}</p>
                        <p><span className="font-medium text-slate-700">风险提醒：</span>避免强行借势社会争议，优先转译为品牌可承接的生活场景。</p>
                      </div>
                    </a>
                  )) : <p className="text-sm text-slate-500">暂无可关联热点。</p>}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">可复用模板</h2>
                <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-7 text-white">
                  {item.repeatable_patterns || "结构化后会在这里沉淀可复用策略模型。"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5">
            <Card className="rounded-2xl border-[#dce7fb] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="text-blue-600" size={20} /> AI传播规律理解</h2>
                <InsightCard title="AI核心传播洞察" value={item.ai_core_insight || item.creativity || "AI 正在提炼这个案例的一句话传播洞察。"} />
                <MarketingModelCard item={item} />
                <KnowledgeSection title="为什么成功" items={splitTags(item.communication_effect || structured?.why_it_worked?.join?.("、") || "")} fallback="等待 AI 从传播效果中提炼成功原因。" />
                <KnowledgeSection title="情绪机制" items={splitTags(item.emotional_mechanisms || item.emotion_tags || "")} fallback="等待 AI 识别安全感、陪伴感、松弛感等情绪触发器。" capsule="violet" />
                <PsychologyInsight item={item} />
                <ContentStructureFlow items={splitTags(item.content_structure_model || "")} />
                <KnowledgeSection title="AI可调用策略模板" items={splitTags(item.strategy_patterns || item.repeatable_patterns || item.reusable_methods || "")} fallback="等待 AI 生成可复用传播规律。" />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <KnowledgeSection title="适用行业" items={splitTags(item.suitable_industries || item.suitable_for || "")} fallback="待判断" compact />
                  <KnowledgeSection title="不适用行业" items={splitTags(item.unsuitable_industries || item.not_suitable_for || "")} fallback="待判断" compact capsule="slate" />
                </div>
                <KnowledgeSection title="风险点" items={splitTags(item.risk_points || "")} fallback="暂无风险点，建议人工补充。" capsule="amber" />
                <PlatformStrategyGrid strategy={platformStrategy} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="space-y-4 p-5">
                <button className="flex w-full items-center justify-between text-left text-base font-semibold" onClick={() => setShowEditor(!showEditor)}>
                  <span>编辑结构化字段</span>
                  <span className="text-xs font-medium text-blue-600">{showEditor ? "收起" : "展开"}</span>
                </button>
                {showEditor ? (
                  <>
                <Field label="案例名称" value={draft.title || ""} onChange={(value) => setDraft({ ...draft, title: value })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="品牌" value={draft.brand || ""} onChange={(value) => setDraft({ ...draft, brand: value })} />
                  <Field label="行业" value={draft.industry || ""} onChange={(value) => setDraft({ ...draft, industry: value })} />
                  <Field label="平台标签" value={draft.platform_tags || ""} onChange={(value) => setDraft({ ...draft, platform_tags: value })} />
                  <Field label="策略标签" value={draft.strategy_tags || ""} onChange={(value) => setDraft({ ...draft, strategy_tags: value })} />
                  <Field label="情绪标签" value={draft.emotion_tags || ""} onChange={(value) => setDraft({ ...draft, emotion_tags: value })} />
                  <Field label="知识价值评分" value={String(draft.knowledge_score ?? 0)} onChange={(value) => setDraft({ ...draft, knowledge_score: Number(value) || 0 })} />
                </div>
                <TextField label="AI核心传播洞察" value={draft.ai_core_insight || ""} onChange={(value) => setDraft({ ...draft, ai_core_insight: value })} />
                <TextField label="策略规律" value={draft.repeatable_patterns || ""} onChange={(value) => setDraft({ ...draft, repeatable_patterns: value })} />
                <TextField label="风险点" value={draft.risk_points || ""} onChange={(value) => setDraft({ ...draft, risk_points: value })} />
                <TextField label="适合复用场景" value={draft.suitable_for || ""} onChange={(value) => setDraft({ ...draft, suitable_for: value })} />
                <TextField label="不适合复用场景" value={draft.not_suitable_for || ""} onChange={(value) => setDraft({ ...draft, not_suitable_for: value })} />
                  </>
                ) : <p className="text-sm leading-6 text-slate-500">人工修正入口已收起，默认优先展示 AI 理解到的营销认知。</p>}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">AI可调用策略模板</h2>
                <div className="mt-4 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white">
                  <p className="text-base font-semibold">{strategyTemplate.template_name}</p>
                  <p className="mt-4 text-xs text-slate-300">核心结构</p>
                  <div className="mt-2 flex flex-wrap gap-2">{strategyTemplate.core_flow.map((row) => <span key={row} className="rounded-full bg-white/10 px-3 py-1 text-xs">{row}</span>)}</div>
                  <p className="mt-4 text-xs text-slate-300">适用场景</p>
                  <div className="mt-2 flex flex-wrap gap-2">{strategyTemplate.suitable_scenarios.map((row) => <span key={row} className="rounded-full bg-blue-400/20 px-3 py-1 text-xs text-blue-100">{row}</span>)}</div>
                  <p className="mt-4 text-xs text-slate-300">平台适配</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {Object.entries(strategyTemplate.platform_adaptation).map(([platform, rows]) => (
                      <div key={platform} className="rounded-xl bg-white/10 p-3">
                        <p className="text-xs font-semibold text-blue-100">{platformName(platform)}</p>
                        <p className="mt-1 text-xs text-slate-200">{rows.join(" / ")}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-300">可调用系统</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {strategyTemplate.callable_systems.map((row) => <span key={row} className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100">{row}</span>)}
                  </div>
                </div>
                <button className="mt-4 text-sm font-medium text-blue-600" onClick={() => setShowJson(!showJson)}>{showJson ? "隐藏原始结构化 JSON" : "查看原始结构化 JSON"}</button>
                {showJson && structured ? (
                  <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-white">{JSON.stringify(structured, null, 2)}</pre>
                ) : !structured ? (
                  <p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-slate-600">还没有结构化结果，点击“一键 DeepSeek 结构化”生成。</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/75 px-3 py-1 text-slate-700 shadow-sm">{children}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-900">{value}</p></div>;
}

function CallableSystems({ item }: { item: MarketingCase }) {
  const systems = [
    { name: "热点雷达", desc: "用于热点营销建议召回相似案例", enabled: Boolean(item.callable_by_hotspot || item.rag_enabled) },
    { name: "图文生产", desc: "用于生成图文内容结构和表达方式", enabled: Boolean(item.callable_by_content) },
    { name: "Campaign执行", desc: "用于扩展传播路径和执行任务", enabled: Boolean(item.callable_by_campaign) },
    { name: "PPT提案", desc: "用于客户提案策略模型引用", enabled: Boolean(item.callable_by_ppt) },
  ];
  return (
    <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">可被调用的系统</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {systems.map((system) => (
            <div key={system.name} className="rounded-xl border border-[#edf1f6] bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{system.name}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${system.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{system.enabled ? "enabled" : "pending"}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{system.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Lifecycle({ item }: { item: MarketingCase }) {
  const steps = [
    { label: "原始素材", active: true },
    { label: "AI理解", active: item.pipeline_stage !== "raw" || item.structure_status !== "pending" },
    { label: "人工审核", active: item.review_status === "approved" },
    { label: "高价值案例", active: (item.knowledge_score || 0) >= 80 || item.reference_value === "high" },
    { label: "RAG入库", active: Boolean(item.rag_enabled || item.embedding_status === "embedded") },
    { label: "业务系统调用", active: Boolean(item.callable_by_hotspot || item.callable_by_content || item.callable_by_campaign || item.callable_by_ppt) },
    { label: "用户反馈", active: false },
    { label: "持续优化", active: false },
  ];
  return (
    <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">知识资产生命周期</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${step.active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{step.label}</span>
              {index < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">AI负责提炼，人工负责判断。审核后的案例才会进入正式知识库并被业务系统调用。</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-5 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-[1px] shadow-lg shadow-blue-500/10">
      <div className="rounded-2xl bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-600"><Sparkles size={16} /> {title}</p>
        <p className="mt-3 text-xl font-semibold leading-8 text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function KnowledgeSection({ title, items, fallback, capsule = "blue", compact = false }: { title: string; items: string[]; fallback: string; capsule?: "blue" | "violet" | "amber" | "slate"; compact?: boolean }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600"
  };
  return (
    <div className={`${compact ? "" : "mt-5"} rounded-2xl border border-[#edf1f6] bg-white p-4`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.slice(0, 8).map((item) => <span key={item} className={`rounded-full px-3 py-1 text-xs font-medium ${colors[capsule]}`}>{item}</span>) : <p className="text-sm leading-6 text-slate-500">{fallback}</p>}
      </div>
    </div>
  );
}

function MarketingModelCard({ item }: { item: MarketingCase }) {
  const subModels = splitTags(item.sub_models || "去广告化表达、情绪优先于功能、品牌人格化");
  const suitable = splitTags(item.suitable_industries || item.suitable_for || "高审美、高情绪价值、新消费、生活方式品牌");
  const unsuitable = splitTags(item.unsuitable_industries || item.not_suitable_for || "强参数驱动、强转化硬广、低容错舆情环境");
  return (
    <div className="mt-5 rounded-2xl border border-[#edf1f6] bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
      <p className="text-sm text-blue-200">AI传播模型</p>
      <h3 className="mt-2 text-2xl font-semibold">{item.marketing_model || "情绪价值传播模型"}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{item.marketing_model_definition || defaultModelDefinition(item)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {subModels.map((model) => <span key={model} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">{model}</span>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-blue-100">适用条件</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{suitable.join(" / ")}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-amber-100">不适用条件</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{unsuitable.join(" / ")}</p>
        </div>
      </div>
    </div>
  );
}

function PsychologyInsight({ item }: { item: MarketingCase }) {
  const items = splitTags(item.user_psychology_insights || "");
  const summary = items[0]
    ? `因为这个案例让用户可以表达「${items[0].replace(/^用户/, "")}」，而不只是接收品牌信息。`
    : "因为这个案例把产品表达转译成了用户愿意分享的情绪、身份和生活态度。";
  return (
    <div className="mt-5 rounded-2xl border border-[#edf1f6] bg-white p-4">
      <h3 className="text-sm font-semibold">AI用户心理洞察</h3>
      <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-medium leading-6 text-violet-800">用户为什么愿意传播这个案例？{summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.slice(0, 6).map((row) => <span key={row} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">{row}</span>) : <span className="text-sm text-slate-500">等待 AI 解释用户为什么愿意传播这个案例。</span>}
      </div>
    </div>
  );
}

function ContentStructureFlow({ items }: { items: string[] }) {
  const steps = items.length ? items.slice(0, 7) : ["反预期切入", "情绪洞察", "去广告化表达", "品牌自然植入", "跨平台扩散"];
  return (
    <div className="mt-5 rounded-2xl border border-[#edf1f6] bg-white p-4">
      <h3 className="text-sm font-semibold">内容结构模型</h3>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">{step}</span>
            {index < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformStrategyGrid({ strategy }: { strategy: Record<string, string[]> }) {
  const platforms = ["xiaohongshu", "douyin", "weibo", "bilibili"];
  return (
    <div className="mt-5 rounded-2xl border border-[#edf1f6] bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold">平台打法</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {platforms.map((platform) => {
          const guide = platformGuide(platform, strategy[platform] || strategy[platformName(platform)] || []);
          return (
            <div key={platform} className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold text-blue-600">{platformName(platform)}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-800">推荐内容形态：</span>{guide.form}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-800">推荐表达方式：</span>{guide.expression}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-800">不建议做法：</span>{guide.avoid}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm"><span className="text-slate-500">{label}</span><input className="mt-1 h-10 w-full rounded-lg border border-[#dde4ef] px-3 outline-none focus:border-blue-500" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm"><span className="text-slate-500">{label}</span><textarea className="mt-1 min-h-24 w-full rounded-lg border border-[#dde4ef] p-3 outline-none focus:border-blue-500" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function stageName(value: string) {
  const names: Record<string, string> = { raw: "原始素材", ai_structured: "AI结构化", human_reviewed: "人工审核", approved: "已批准", embedded: "已向量化", active: "可调用", needs_rerun: "待重跑" };
  return names[value] || value || "原始素材";
}

function reviewName(value: string) {
  const names: Record<string, string> = { pending: "待审核", approved: "已通过", returned: "已退回" };
  return names[value] || value || "待审核";
}

function platformName(platform: string) {
  const names: Record<string, string> = { weibo: "微博", douyin: "抖音", xiaohongshu: "小红书", zhihu: "知乎", bilibili: "B站", 小红书: "小红书", 抖音: "抖音", 微博: "微博", B站: "B站" };
  return names[platform] || platform;
}

function splitTags(value: string) {
  return value.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function knowledgeLevel(item: MarketingCase) {
  if (item.knowledge_level) return item.knowledge_level;
  if ((item.knowledge_score || 0) >= 92) return "S级案例";
  if ((item.knowledge_score || 0) >= 82) return "A级案例";
  if (item.repeatable_patterns || item.strategy_patterns) return "高复用案例";
  return "热点高适配";
}

function embeddingLabel(item: MarketingCase) {
  if (item.embedding_status === "embedded") return item.embedding_dimension ? `向量已入库 ${item.embedding_dimension}维` : "向量已入库";
  if (item.embedding_status === "failed") return "向量化失败";
  if (item.embedding_status === "queued" || item.embedding_status === "pending") return "待向量化";
  return "未向量化";
}

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission) || permissions.includes("admin_access");
}

function defaultModelDefinition(item: MarketingCase) {
  const model = item.marketing_model || "情绪价值传播模型";
  if (model.includes("生活方式")) return "通过生活方式、场景审美和用户自我投射替代直接产品卖点，让品牌成为用户表达生活态度的媒介。";
  if (model.includes("陪伴") || model.includes("家庭")) return "把产品或品牌转化为家庭关系、陪伴感和安全感的载体，降低功能表达的距离感。";
  if (model.includes("社交货币")) return "制造用户愿意转发、讨论和二创的身份符号，让内容成为社交表达素材。";
  if (model.includes("反差")) return "用反预期表达打破品类惯性，制造记忆点和讨论入口。";
  if (model.includes("治愈")) return "用轻情绪、低压力和陪伴感建立内容亲近感，适合长期心智建设。";
  return "通过情绪价值、身份认同和内容场景替代单纯功能沟通，让用户愿意主动传播。";
}

function sharedText(left?: string | null, right?: string | null) {
  const leftTags = splitTags(left || "");
  const rightTags = splitTags(right || "");
  const shared = leftTags.filter((tag) => rightTags.includes(tag));
  const value = shared.length ? shared : leftTags.concat(rightTags).slice(0, 3);
  return value.length ? value.join(" / ") : "情绪机制与内容结构相近";
}

function topicPlay(platform: string) {
  const plays: Record<string, string> = {
    xiaohongshu: "优先做情绪种草和生活方式图文，不建议硬广参数堆砌。",
    douyin: "优先做短视频演绎、情绪反差和视觉节奏，不建议长逻辑说明。",
    weibo: "优先做话题扩散和观点讨论，不建议强行站队争议。",
    bilibili: "优先做品牌态度解读、文化分析和深度复盘，不建议纯带货口播。",
    zhihu: "优先做问题拆解、经验复盘和专业回答，不建议情绪化蹭热点。",
  };
  return plays[platform] || "优先把热点转译为品牌可承接的真实场景，再选择平台友好的内容形态。";
}

function parsePlatformStrategy(raw?: string | null): Record<string, string[]> {
  if (!raw) return { xiaohongshu: ["场景化种草"], douyin: ["短视频演绎"], bilibili: ["深度内容复盘"], weibo: ["话题扩散"] };
  try {
    const parsed = JSON.parse(raw);
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : typeof value === "object" && value ? Object.values(value).flat().map(String) : [String(value)]]));
  } catch {
    return { xiaohongshu: splitTags(raw) };
  }
}

function platformGuide(platform: string, rows: string[]) {
  const text = rows.join(" / ");
  const fallback: Record<string, { form: string; expression: string; avoid: string }> = {
    xiaohongshu: { form: "场景化图文、清单、生活方式笔记", expression: "情绪种草、真实体验、低广告感表达", avoid: "硬广参数堆砌、过度品牌自夸" },
    douyin: { form: "短视频演绎、情绪反差、视觉节奏剪辑", expression: "强开头、场景冲突、轻剧情化", avoid: "长逻辑说明、信息密度过高" },
    weibo: { form: "话题扩散、观点讨论、二创素材", expression: "一句话观点、可转发社交货币", avoid: "强行站队、消费公共争议" },
    bilibili: { form: "品牌态度解读、文化分析、深度复盘", expression: "讲清楚背景、机制和价值判断", avoid: "纯带货口播、浅层情绪输出" },
  };
  const base = fallback[platform] || fallback.xiaohongshu;
  return text ? { ...base, expression: `${base.expression}；${text}` } : base;
}

function parseStrategyTemplate(raw?: string | null): { template_name: string; suitable_scenarios: string[]; core_flow: string[]; platform_adaptation: Record<string, string[]>; callable_systems: string[] } {
  const fallback = {
    template_name: "去广告化情绪传播模板",
    suitable_scenarios: ["新消费品牌", "生活方式品牌", "女性消费", "高审美内容传播"],
    core_flow: ["情绪洞察", "真实场景", "品牌自然融入", "用户自我投射", "跨平台扩散"],
    platform_adaptation: { xiaohongshu: ["情绪种草"], douyin: ["视觉节奏"], weibo: ["话题扩散"], bilibili: ["态度解读"] },
    callable_systems: ["热点雷达", "图文生产", "Campaign执行", "PPT提案"]
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      suitable_scenarios: Array.isArray(parsed.suitable_scenarios) ? parsed.suitable_scenarios.map(String) : fallback.suitable_scenarios,
      core_flow: Array.isArray(parsed.core_flow) ? parsed.core_flow.map(String) : fallback.core_flow,
      platform_adaptation: normalizePlatformMap(parsed.platform_adaptation) || fallback.platform_adaptation,
      callable_systems: Array.isArray(parsed.callable_systems) ? parsed.callable_systems.map(String) : fallback.callable_systems
    };
  } catch {
    return { ...fallback, core_flow: splitTags(raw) };
  }
}

function normalizePlatformMap(value: unknown): Record<string, string[]> | null {
  if (!value || typeof value !== "object") return null;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, row]) => [key, Array.isArray(row) ? row.map(String) : [String(row)]]));
}
