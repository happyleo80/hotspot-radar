"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, Database, FileText, Network, Sparkles, Tags } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, CaseRawMaterial, MarketingCase } from "@/lib/api";

const tabs = ["案例总览", "原始素材库", "AI结构化工作台", "案例审核与修正", "知识库标签与规则"];
const flow = [
  { label: "原始案例输入", desc: "采集网页、文档、AI收藏建议等原始材料", stage: "raw" },
  { label: "AI提炼传播规律", desc: "识别核心洞察、成功原因和可复用策略", stage: "ai_structured" },
  { label: "AI识别情绪机制", desc: "抽取安全感、陪伴感、身份认同等情绪触发器", stage: "ai_structured" },
  { label: "人工校正与审核", desc: "人工修正结构化结果，确保可用于客户提案", stage: "human_reviewed" },
  { label: "策略标签化", desc: "沉淀行业、平台、策略、情绪标签体系", stage: "approved" },
  { label: "知识入库", desc: "加入 RAG 知识库，形成 AI-ready 资产", stage: "embedded" },
  { label: "被热点系统调用", desc: "在热点分析中召回相似案例和传播模型", stage: "active" }
];
const industryTags = ["汽车", "美妆", "母婴", "食品饮料", "科技数码", "文旅", "金融", "教育", "游戏", "IP联名"];
const platformTags = ["小红书", "抖音", "微博", "B站", "知乎", "微信公众号", "线下活动", "PR传播"];
const strategyTags = ["情绪价值", "社交货币", "反差传播", "事件营销", "IP联名", "用户共创", "KOL种草", "话题挑战", "争议讨论", "内容种草", "品牌年轻化"];
const emotionTags = ["治愈", "松弛感", "陪伴", "热血", "怀旧", "安全感", "快乐", "幽默", "精致生活", "身份认同"];

export default function CasesAdminPage() {
  return (
    <AuthGate>
      <CasesProductionCenter />
    </AuthGate>
  );
}

function CasesProductionCenter() {
  const [cases, setCases] = useState<MarketingCase[]>([]);
  const [rawMaterials, setRawMaterials] = useState<CaseRawMaterial[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newRaw, setNewRaw] = useState({ source_type: "markdown", raw_title: "", source_url: "", raw_text: "" });

  async function load() {
    const [permissionRows, caseRows, rawRows] = await Promise.all([api.myPermissions(), api.cases(), api.rawMaterials()]);
    setPermissions(permissionRows.permissions);
    setCases(caseRows);
    setRawMaterials(rawRows);
  }

  useEffect(() => {
    load().catch(() => setMessage("暂无案例知识库权限，请联系管理员在管理后台开通“查看案例知识库”。"));
  }, []);

  async function importCases() {
    setBusy("import");
    const result = await api.importCases(100);
    setMessage(`导入完成：获取 ${result.fetched} 篇，新增 ${result.created} 篇，更新 ${result.updated} 篇，结构化 ${result.analyzed} 篇。`);
    await load();
    setBusy("");
  }

  async function createRaw() {
    if (!newRaw.raw_title.trim()) return;
    setBusy("raw");
    await api.createRawMaterial(newRaw);
    setNewRaw({ source_type: "markdown", raw_title: "", source_url: "", raw_text: "" });
    await load();
    setBusy("");
  }

  async function structure(id: number) {
    setBusy(`structure-${id}`);
    await api.structureCase(id);
    await load();
    setBusy("");
  }

  async function approve(id: number) {
    setBusy(`approve-${id}`);
    await api.approveCase(id);
    await load();
    setBusy("");
  }

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return cases;
    return cases.filter((item) => [item.title, item.summary, item.industry, item.tags, item.brand, item.strategy_tags].some((value) => (value || "").toLowerCase().includes(keyword)));
  }, [cases, query]);

  const structured = cases.filter((item) => item.pipeline_stage !== "raw" && item.structure_status !== "pending");
  const pendingStructure = cases.filter((item) => item.pipeline_stage === "raw" || item.structure_status === "pending");
  const pendingReview = cases.filter((item) => item.review_status === "pending" && item.pipeline_stage === "ai_structured");
  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-6 text-slate-950">
      <section className="mx-auto max-w-[1480px]">
        <div className="relative overflow-hidden rounded-3xl border border-[#dce7fb] bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(124,58,237,0.18),transparent_32%),linear-gradient(135deg,#f8fbff,#eef4ff_48%,#f9f5ff)] px-7 py-7 shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-blue-600">返回工作台</Link>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 shadow-sm"><Sparkles size={14} /> AI Marketing Knowledge</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal">AI营销知识工作台</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">AI 正在把营销案例转化为可复用的传播规律、情绪机制、平台打法和策略模板。这些知识将被热点雷达、图文生产、Campaign执行和PPT提案系统调用。</p>
          </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#dce7fb] bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {flow.map((item, index) => (
              <div key={item.label} title={item.desc} onClick={() => setQuery(item.label.replace(/^AI|与审核|输入|提炼|识别|校正|标签化|入库|被业务系统调用/g, ""))} className={`group relative min-h-[118px] cursor-pointer overflow-hidden rounded-2xl border px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-md ${index <= currentFlowIndex(cases) ? "border-blue-200 bg-blue-50/80" : "border-[#edf1f6] bg-white"}`}>
                <div className="absolute right-3 top-3 h-8 w-8 animate-pulse rounded-full bg-blue-500/10" />
                <div className="relative flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><Sparkles size={15} /></span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-blue-600">{stageCount(cases, item.stage)}</span>
                </div>
                <p className="relative mt-3 text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="relative mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.desc}</p>
                {index < flow.length - 1 ? <ArrowRight className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-blue-300 xl:block" size={18} /> : null}
              </div>
            ))}
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl border border-[#e4eaf3] bg-white px-4 py-3 text-sm text-slate-600">{message}</p>}

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "border border-[#e3e8f2] bg-white text-slate-700"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "案例总览" && (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric title="总案例数" value={cases.length} icon={<Database size={22} />} />
              <Metric title="已结构化" value={structured.length} icon={<BrainCircuit size={22} />} />
              <Metric title="待结构化" value={pendingStructure.length} icon={<FileText size={22} />} />
              <Metric title="待人工审核" value={pendingReview.length} icon={<CheckCircle2 size={22} />} />
              <Metric title="AI知识节点" value={cases.filter((item) => item.rag_enabled).length} icon={<Network size={22} />} />
              <Metric title="原始素材" value={rawMaterials.length} icon={<FileText size={22} />} />
            </div>
            <KnowledgeOverview cases={cases} />
            <ModelDistribution cases={cases} setQuery={setQuery} />
            <CaseTable cases={highValueCases(filtered)} query={query} setQuery={setQuery} structure={structure} approve={approve} busy={busy} permissions={permissions} title="高价值知识资产" />
            <KnowledgeNodes cases={cases} setQuery={setQuery} />
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
              <Distribution title="行业分布" rows={distribution(cases.map((item) => item.industry || "未分类"))} />
              <Distribution title="平台分布" rows={distribution(cases.flatMap((item) => splitTags(item.platform_tags || item.platform || "未标记")))} />
            </div>
            <CaseTable cases={filtered} query={query} setQuery={setQuery} structure={structure} approve={approve} busy={busy} permissions={permissions} title="全部案例资产" />
          </>
        )}

        {activeTab === "原始素材库" && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-xl border-[#e4eaf3] shadow-none">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-base font-semibold">新增原始素材</h2>
                <select className="h-10 w-full rounded-lg border border-[#dde4ef] px-3 text-sm" value={newRaw.source_type} onChange={(e) => setNewRaw({ ...newRaw, source_type: e.target.value })}>
                  {["ppt", "pdf", "word", "image", "web_link", "xiaohongshu_link", "douyin_link", "weibo_link", "bilibili_link", "zhihu_link", "markdown", "ai_saved"].map((item) => <option key={item}>{item}</option>)}
                </select>
                <input className="h-10 w-full rounded-lg border border-[#dde4ef] px-3 text-sm" placeholder="素材标题" value={newRaw.raw_title} onChange={(e) => setNewRaw({ ...newRaw, raw_title: e.target.value })} />
                <input className="h-10 w-full rounded-lg border border-[#dde4ef] px-3 text-sm" placeholder="来源链接 / 文件链接" value={newRaw.source_url} onChange={(e) => setNewRaw({ ...newRaw, source_url: e.target.value })} />
                <textarea className="min-h-40 w-full rounded-lg border border-[#dde4ef] p-3 text-sm" placeholder="Markdown 或原始正文" value={newRaw.raw_text} onChange={(e) => setNewRaw({ ...newRaw, raw_text: e.target.value })} />
                {hasPermission(permissions, "case_upload") ? <Button className="bg-blue-600 hover:bg-blue-700" onClick={createRaw} disabled={busy === "raw"}>加入原始素材库</Button> : <p className="text-sm text-slate-500">当前账号没有上传素材权限。</p>}
              </CardContent>
            </Card>
            <Card className="rounded-xl border-[#e4eaf3] shadow-none">
              <CardContent className="divide-y divide-[#edf1f6] p-0">
                {rawMaterials.map((item) => (
                  <div key={item.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[90px_1fr_120px]">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">#{item.id} {item.source_type}</span>
                    <div>
                      <p className="font-medium">{item.raw_title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.source_url || item.raw_text || "暂无内容"}</p>
                    </div>
                    <span className="text-xs text-slate-500">{stageName(item.processing_status)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {activeTab === "AI结构化工作台" && (
          <WorkQueue cases={pendingStructure.concat(structured).slice(0, 30)} actionLabel="一键 DeepSeek 结构化" onAction={structure} busy={busy} />
        )}

        {activeTab === "案例审核与修正" && (
          <WorkQueue cases={pendingReview.concat(cases.filter((item) => item.review_status === "returned")).slice(0, 30)} actionLabel="通过审核并入库" onAction={approve} busy={busy} />
        )}

        {activeTab === "知识库标签与规则" && (
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <TagPanel title="行业标签" tags={industryTags} />
            <TagPanel title="平台标签" tags={platformTags} />
            <TagPanel title="策略标签" tags={strategyTags} />
            <TagPanel title="情绪标签" tags={emotionTags} />
            <Card className="rounded-xl border-[#e4eaf3] shadow-none lg:col-span-2">
              <CardContent className="p-5 text-sm leading-7 text-slate-600">
                <h2 className="mb-2 text-base font-semibold text-slate-950">知识价值评分规则</h2>
                信息完整度、传播效果明确度、可复用程度、行业参考价值、平台适配价值、风险清晰度共同生成 knowledge_score 0-100。80 分以上自动视为高价值案例。
              </CardContent>
            </Card>
          </section>
        )}
      </section>
    </main>
  );
}

function CaseTable({ cases, query, setQuery, structure, approve, busy, permissions, title }: { cases: MarketingCase[]; query: string; setQuery: (value: string) => void; structure: (id: number) => void; approve: (id: number) => void; busy: string; permissions: string[]; title: string }) {
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">每个案例都以 AI 洞察、传播规律、情绪机制和策略价值呈现。</p>
        </div>
        <input className="h-10 w-full max-w-sm rounded-lg border border-[#dde4ef] px-3 text-sm outline-none focus:border-blue-500" placeholder="搜索案例 / 行业 / 标签" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {cases.map((item) => (
          <article key={item.id} className="group relative overflow-hidden rounded-2xl border border-[#e4eaf3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-[56px] bg-gradient-to-br from-blue-100 to-violet-100 opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{sourceName(item.source_category || "crawled")}</span>
                  <StagePill value={item.pipeline_stage} />
                  <span className="rounded-full bg-violet-50 px-2 py-1 font-medium text-violet-600">{knowledgeLevel(item)}</span>
                </div>
                <Link href={`/cases-admin/${item.id}`} className="mt-3 block line-clamp-2 text-base font-semibold leading-6 text-slate-950 hover:text-blue-600">{item.title}</Link>
                <p className="mt-3 line-clamp-2 rounded-xl bg-blue-50/70 p-3 text-sm leading-6 text-blue-800" title={aiInsight(item)}>
                  <Sparkles className="mr-1 inline text-blue-500" size={15} /> {aiInsight(item)}
                </p>
              </div>
              <AiScore score={item.knowledge_score || 0} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TagBlock title="传播规律" tags={strategyPatternTags(item)} tone="strategy" />
              <TagBlock title="情绪机制" tags={emotionMechanismTags(item)} tone="emotion" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-xl border border-[#edf1f6] bg-white p-3">
                <p className="text-xs font-medium text-slate-500">传播模型</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{marketingModel(item)}</p>
              </div>
              <div className="rounded-xl border border-[#edf1f6] bg-white p-3">
                <p className="text-xs font-medium text-slate-500">适合复用到</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reuseIndustries(item).map((tag) => <span key={tag} className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">{tag}</span>)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {callableSystems(item).map((system) => (
                <span key={system.name} className={`rounded-full px-2.5 py-1 text-xs font-medium ${system.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {system.name} {system.enabled ? "已启用" : "待启用"}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4 text-xs text-slate-500">
              <span>{item.brand || "未知品牌"} / {item.industry || "未分类"} / {item.platform_tags || item.platform || "多平台"}</span>
              <div className="flex gap-2">
                {hasPermission(permissions, "case_structure") ? <Button className="h-8 bg-white px-3 text-xs text-blue-600 hover:bg-blue-50" onClick={() => structure(item.id)} disabled={busy === `structure-${item.id}`}>AI提炼规律</Button> : null}
                {hasPermission(permissions, "case_review") ? <Button className="h-8 bg-blue-600 px-3 text-xs hover:bg-blue-700" onClick={() => approve(item.id)} disabled={busy === `approve-${item.id}`}>加入热点策略库</Button> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkQueue({ cases, actionLabel, onAction, busy }: { cases: MarketingCase[]; actionLabel: string; onAction: (id: number) => void; busy: string }) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cases.map((item) => (
        <Card key={item.id} className="rounded-xl border-[#e4eaf3] shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-sm font-semibold leading-6">{item.title}</h2>
              <StagePill value={item.pipeline_stage} />
            </div>
            <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-500">{item.creativity || item.summary || item.raw_text || "暂无摘要"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-blue-50 px-2 py-1 text-blue-600">评分 {item.knowledge_score || 0}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{item.reference_value}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{reviewName(item.review_status)}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="h-9 bg-blue-600 text-xs hover:bg-blue-700" onClick={() => onAction(item.id)} disabled={busy.includes(String(item.id))}>{actionLabel}</Button>
              <a className="inline-flex h-9 items-center rounded-md border border-[#dde4ef] px-3 text-xs font-medium text-slate-700 hover:bg-slate-50" href={`/cases-admin/${item.id}`}>打开详情</a>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function KnowledgeOverview({ cases }: { cases: MarketingCase[] }) {
  const patterns = uniqueCount(cases.flatMap((item) => strategyPatternTags(item)));
  const emotions = uniqueCount(cases.flatMap((item) => emotionMechanismTags(item)));
  const models = uniqueCount(cases.map((item) => marketingModel(item)));
  const highValue = cases.filter((item) => item.reference_value === "high" || (item.knowledge_score || 0) >= 80).length;
  const callable = cases.filter((item) => item.callable_by_hotspot || item.rag_enabled).length;
  const rag = cases.filter((item) => item.rag_enabled).length;
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <InsightMetric title="传播规律数量" value={patterns} />
      <InsightMetric title="情绪机制数量" value={emotions} />
      <InsightMetric title="传播模型数量" value={models} />
      <InsightMetric title="高价值案例" value={highValue} />
      <InsightMetric title="可调用知识资产" value={callable} />
      <InsightMetric title="已入 RAG" value={rag} />
    </section>
  );
}

function ModelDistribution({ cases, setQuery }: { cases: MarketingCase[]; setQuery: (value: string) => void }) {
  const models = ["情绪价值传播", "生活方式传播", "社交货币传播", "陪伴经济传播", "群体认同传播", "反差传播", "人格化传播", "治愈系传播"];
  return (
    <section className="mt-5 rounded-2xl border border-[#e4eaf3] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">传播模型分布</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {models.map((model) => {
          const rows = cases.filter((item) => marketingModel(item).includes(model.replace("传播", "")) || splitTags(item.sub_models || "").some((tag) => model.includes(tag.replace("模型", ""))));
          const avg = rows.length ? Math.round(rows.reduce((sum, item) => sum + (item.knowledge_score || 0), 0) / rows.length) : 0;
          return (
            <button key={model} onClick={() => setQuery(model.replace("传播", ""))} className="rounded-2xl border border-[#edf1f6] bg-slate-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/70">
              <p className="text-sm font-semibold">{model}</p>
              <p className="mt-2 text-xs text-slate-500">{rows.length} 个案例 / 平均 AI策略价值 {avg}</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{rows.some((item) => item.callable_by_hotspot || item.rag_enabled) ? "可调用" : "待入库"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeNodes({ cases, setQuery }: { cases: MarketingCase[]; setQuery: (value: string) => void }) {
  const nodes = ["松弛感", "情绪价值", "社交货币", "女性决策", "陪伴经济", "去广告化表达", "生活方式传播", "家庭情绪空间", "内容种草"];
  return (
    <section className="mt-5 rounded-2xl border border-[#e4eaf3] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">热门知识节点</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {nodes.map((node) => (
          <button key={node} onClick={() => setQuery(node)} className="rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:shadow-sm">
            {node} <span className="ml-1 text-xs text-slate-400">{nodeCount(cases, node)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AiScore({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-500 p-[2px] shadow-lg shadow-blue-500/10">
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[14px] bg-white">
        <span className="text-2xl font-semibold text-slate-950">{Math.round(clamped)}</span>
        <span className="text-[10px] font-medium text-blue-600">AI策略价值</span>
      </div>
    </div>
  );
}

function InsightMetric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-2xl border-[#e4eaf3] bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-3xl font-semibold text-transparent">{value}</p>
      </CardContent>
    </Card>
  );
}

function TagBlock({ title, tags, tone }: { title: string; tags: string[]; tone: "strategy" | "emotion" }) {
  const visible = tags.slice(0, 4);
  const all = tags.join(" / ");
  return (
    <div title={all} className="rounded-xl border border-[#edf1f6] bg-slate-50/60 p-3">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {visible.map((tag) => (
          <span key={tag} className={`rounded-full px-2 py-1 text-xs font-medium ${tone === "strategy" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{tag}</span>
        ))}
        {!visible.length ? <span className="text-xs text-slate-400">待 AI 提炼</span> : null}
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <Card className="rounded-xl border-[#e4eaf3] shadow-none"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">{icon}</div><div><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div></CardContent></Card>;
}

function Distribution({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const max = Math.max(...rows.map(([, count]) => count), 1);
  return <Card className="rounded-xl border-[#e4eaf3] shadow-none"><CardContent className="space-y-3 p-5"><h2 className="text-base font-semibold">{title}</h2>{rows.slice(0, 8).map(([name, count]) => <div key={name} className="grid grid-cols-[92px_1fr_40px] items-center gap-3 text-sm"><span className="truncate text-slate-600">{name}</span><div className="h-2 rounded-full bg-[#edf1f6]"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${(count / max) * 100}%` }} /></div><span className="text-right text-slate-500">{count}</span></div>)}</CardContent></Card>;
}

function TagPanel({ title, tags }: { title: string; tags: string[] }) {
  return <Card className="rounded-xl border-[#e4eaf3] shadow-none"><CardContent className="p-5"><h2 className="text-base font-semibold">{title}</h2><div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-600">{tag}</span>)}</div></CardContent></Card>;
}

function StagePill({ value }: { value: string }) {
  return <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">{stageName(value)}</span>;
}

function stageName(value: string) {
  const names: Record<string, string> = { raw: "原始素材", ai_structured: "AI结构化", human_reviewed: "人工审核", approved: "已批准", embedded: "已向量化", active: "可调用", needs_rerun: "待重跑" };
  return names[value] || value || "原始素材";
}

function reviewName(value: string) {
  const names: Record<string, string> = { pending: "待审核", approved: "已通过", returned: "已退回" };
  return names[value] || value || "待审核";
}

function sourceName(value: string) {
  const names: Record<string, string> = { uploaded: "用户上传", crawled: "行业采集", ai_saved: "AI收藏", manual: "手动录入" };
  return names[value] || value;
}

function aiInsight(item: MarketingCase) {
  return item.ai_core_insight || item.creativity || item.summary || "AI 正在从原始案例中提炼一句话传播洞察。";
}

function strategyPatternTags(item: MarketingCase) {
  return splitTags(item.strategy_patterns || item.repeatable_patterns || item.strategy_tags || item.reusable_methods || "情绪价值、内容种草、社交货币");
}

function emotionMechanismTags(item: MarketingCase) {
  return splitTags(item.emotional_mechanisms || item.emotion_tags || "松弛感、安全感、陪伴感、身份认同");
}

function knowledgeLevel(item: MarketingCase) {
  if (item.knowledge_level) return item.knowledge_level;
  if ((item.knowledge_score || 0) >= 92) return "S级案例";
  if ((item.knowledge_score || 0) >= 82) return "A级案例";
  if (item.repeatable_patterns || item.strategy_patterns) return "高复用案例";
  return "热点高适配";
}

function marketingModel(item: MarketingCase) {
  if (item.marketing_model) return item.marketing_model;
  return (item.strategy_patterns || item.repeatable_patterns || "").includes("生活") ? "生活方式传播模型" : "情绪价值传播模型";
}

function reuseIndustries(item: MarketingCase) {
  const tags = splitTags(item.suitable_industries || item.suitable_for || item.industry || "新消费、生活方式品牌、文旅、家居");
  return tags.length ? tags.slice(0, 4) : ["新消费", "生活方式品牌"];
}

function callableSystems(item: MarketingCase) {
  return [
    { name: "热点雷达", enabled: Boolean(item.callable_by_hotspot || item.rag_enabled) },
    { name: "图文生产", enabled: Boolean(item.callable_by_content) },
    { name: "Campaign", enabled: Boolean(item.callable_by_campaign) },
    { name: "PPT提案", enabled: Boolean(item.callable_by_ppt) },
  ];
}

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission) || permissions.includes("admin_access");
}

function highValueCases(cases: MarketingCase[]) {
  return [...cases].sort((a, b) => (b.knowledge_score || 0) - (a.knowledge_score || 0)).slice(0, 8);
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function nodeCount(cases: MarketingCase[], node: string) {
  return cases.filter((item) => [item.ai_core_insight, item.strategy_patterns, item.emotional_mechanisms, item.marketing_model, item.sub_models, item.user_psychology_insights].some((value) => (value || "").includes(node))).length;
}

function stageCount(cases: MarketingCase[], stage: string) {
  if (stage === "embedded") return cases.filter((item) => item.embedding_status === "embedded").length;
  if (stage === "human_reviewed") return cases.filter((item) => item.review_status === "approved").length;
  return cases.filter((item) => item.pipeline_stage === stage || item.structure_status === stage).length;
}

function currentFlowIndex(cases: MarketingCase[]) {
  if (cases.some((item) => item.rag_enabled)) return 6;
  if (cases.some((item) => item.embedding_status === "embedded")) return 5;
  if (cases.some((item) => item.review_status === "approved")) return 4;
  if (cases.some((item) => item.pipeline_stage === "ai_structured")) return 2;
  return 0;
}

function splitTags(value: string) {
  return value.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function distribution(values: string[]) {
  const counter = new Map<string, number>();
  values.forEach((value) => counter.set(value, (counter.get(value) || 0) + 1));
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
}
