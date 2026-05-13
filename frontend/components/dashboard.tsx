"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Download, RefreshCw, Sparkles } from "lucide-react";
import { api, Resonance, Topic } from "@/lib/api";
import { formatHeat } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const platforms = [
  { id: "all", label: "全网" },
  { id: "weibo", label: "微博热搜" },
  { id: "douyin", label: "抖音热点" },
  { id: "xiaohongshu", label: "小红书趋势" },
  { id: "zhihu", label: "知乎" },
  { id: "bilibili", label: "B站热门" }
];

export function Dashboard() {
  const [active, setActive] = useState("all");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resonance, setResonance] = useState<Resonance[]>([]);
  const [rising, setRising] = useState<Topic[]>([]);
  const [highValue, setHighValue] = useState<Topic[]>([]);
  const [highRisk, setHighRisk] = useState<Topic[]>([]);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [collectReport, setCollectReport] = useState<Array<{ platform: string; count: number; source: string }>>([]);

  async function load(platform = active) {
    setLoading(true);
    const [topicRows, resonanceRows, risingRows, valueRows, riskRows] = await Promise.all([
      api.topics(platform === "all" ? undefined : platform),
      api.resonance(),
      api.rising(),
      api.highValue(),
      api.highRisk()
    ]);
    setTopics(topicRows);
    setResonance(resonanceRows);
    setRising(risingRows);
    setHighValue(valueRows);
    setHighRisk(riskRows);
    setLoading(false);
  }

  useEffect(() => {
    load(active).catch(() => setLoading(false));
  }, [active]);

  async function analyzeTopic(topic: Topic) {
    setBusy(`analyze-${topic.id}`);
    await api.analyze(topic.id);
    await load();
    setBusy("");
  }

  async function generateBrief() {
    setBusy("brief");
    const result = await api.brief();
    setBrief(result.markdown);
    setBusy("");
  }

  async function collect() {
    setBusy("collect");
    const result = await api.collectAll();
    setCollectReport(result.platforms || []);
    await load();
    setBusy("");
  }

  const visibleResonance = resonance.slice(0, 8);
  const visibleHighValue = highValue.slice(0, 6);
  const visibleHighRisk = highRisk.slice(0, 6);

  return (
    <main className="radar-grid min-h-screen">
      <section className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Trustwin 君信品牌管理</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">热点话题雷达</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
              聚合微博、抖音、小红书、知乎、B站热点，识别跨平台共振、营销价值和风险边界。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-white text-ink hover:bg-mist" onClick={collect} disabled={!!busy}>
              <RefreshCw size={16} /> 采集最新热点
            </Button>
            <Button className="bg-teal hover:bg-teal/90" onClick={generateBrief} disabled={busy === "brief"}>
              <Download size={16} /> 生成每日简报
            </Button>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Metric title="今日热点" value={topics.length} icon={<Activity size={18} />} />
          <Metric title="跨平台共振" value={visibleResonance.length} icon={<BarChart3 size={18} />} />
          <Metric title="高营销价值" value={visibleHighValue.length} icon={<Sparkles size={18} />} />
          <Metric title="高风险话题" value={visibleHighRisk.length} icon={<AlertTriangle size={18} />} />
        </div>

        {collectReport.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-line bg-white px-4 py-3 text-xs text-ink/70 shadow-soft">
            <span className="font-semibold text-ink">本次采集：</span>
            {collectReport.map((item) => (
              <span key={item.platform} className="rounded-md bg-mist px-2 py-1">
                {platformName(item.platform)} / {item.count}条
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2 overflow-x-auto border-b border-line pb-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setActive(platform.id)}
              className={`h-10 shrink-0 rounded-md px-4 text-sm font-medium transition ${
                active === platform.id ? "bg-ink text-white" : "bg-white text-ink hover:bg-mist"
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>今日全网热点 Top 50</CardTitle>
              <span className="text-xs text-ink/55">{loading ? "加载中" : `${topics.length} 条`}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[680px] overflow-auto">
                {topics.map((topic, index) => (
                  <div key={topic.id} className="grid grid-cols-[44px_1fr_auto] gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mist text-sm font-semibold">{index + 1}</div>
                    <div className="min-w-0">
                      <a href={`/topics/${topic.id}`} className="block truncate text-sm font-semibold text-ink hover:text-teal">
                        {topic.title}
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/55">
                        <span>{platformName(topic.platform)}</span>
                        <span>热度 {formatHeat(topic.heat_score)}</span>
                      </div>
                      {topic.analyses[0] && <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/70">{topic.analyses[0].summary}</p>}
                    </div>
                    <Button className="h-8 bg-white px-3 text-xs text-ink hover:bg-mist" onClick={() => analyzeTopic(topic)} disabled={busy === `analyze-${topic.id}`}>
                      <BrainCircuit size={14} /> AI
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <ResonanceList items={visibleResonance} />
            <InsightList title="上升最快话题" items={rising.slice(0, 6).map((item) => `${item.title} / 热度 ${formatHeat(item.heat_score)}`)} />
            <ValueList items={visibleHighValue} />
            <RiskList items={visibleHighRisk} />
          </div>
        </div>

        {brief && (
          <Card className="mt-5">
            <CardHeader><CardTitle>每日策划简报 Markdown</CardTitle></CardHeader>
            <CardContent>
              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-ink p-4 text-sm leading-6 text-white">{brief}</pre>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

function ResonanceList({ items }: { items: Resonance[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>跨平台共振话题</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={`${item.normalized_title}-${index}`} className="grid grid-cols-[24px_1fr] gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber/10 text-xs font-semibold text-amber">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-medium leading-5 text-ink/85">{item.title}</div>
                <span className="shrink-0 rounded bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber">
                  {item.platform_count} 平台
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {item.topics.map((topic) => (
                  <a
                    key={`${topic.platform}-${topic.id}`}
                    href={`/topics/${topic.id}`}
                    className="grid grid-cols-[72px_1fr] gap-2 rounded-md border border-line bg-white px-2 py-1.5 transition hover:border-teal/40 hover:bg-mist/60"
                  >
                    <span className="truncate text-xs font-medium text-teal">{platformName(topic.platform)}</span>
                    <span className="truncate text-xs text-ink/70">{topic.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )) : <p className="text-sm text-ink/55">暂无数据</p>}
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink/55">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">{icon}</div>
      </CardContent>
    </Card>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone?: "risk" }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={item} className="flex gap-3 text-sm">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold ${tone === "risk" ? "bg-coral/10 text-coral" : "bg-amber/10 text-amber"}`}>
              {index + 1}
            </span>
            <span className="leading-5 text-ink/78">{item}</span>
          </div>
        )) : <p className="text-sm text-ink/55">暂无数据</p>}
      </CardContent>
    </Card>
  );
}

function ValueList({ items }: { items: Topic[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>高营销价值话题</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((topic, index) => (
          <a key={topic.id} href={`/topics/${topic.id}`} className="grid grid-cols-[24px_1fr] gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber/10 text-xs font-semibold text-amber">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-mist px-2 py-0.5 text-xs font-medium text-ink/65">{platformName(topic.platform)}</span>
                <span className="rounded bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">{valueReason(topic.title)}</span>
              </span>
              <span className="block line-clamp-2 leading-5 text-ink/78 hover:text-teal">{topic.title}</span>
            </span>
          </a>
        )) : <p className="text-sm text-ink/55">暂无明显高营销价值话题</p>}
      </CardContent>
    </Card>
  );
}

function RiskList({ items }: { items: Topic[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>高风险话题</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((topic, index) => (
          <a key={topic.id} href={`/topics/${topic.id}`} className="grid grid-cols-[24px_1fr] gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-coral/10 text-xs font-semibold text-coral">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-mist px-2 py-0.5 text-xs font-medium text-ink/65">{platformName(topic.platform)}</span>
                <span className="rounded bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">{riskReason(topic.title)}</span>
              </span>
              <span className="block line-clamp-2 leading-5 text-ink/78 hover:text-coral">{topic.title}</span>
            </span>
          </a>
        )) : <p className="text-sm text-ink/55">暂无明显高风险话题</p>}
      </CardContent>
    </Card>
  );
}

function riskReason(title: string) {
  if (/(起诉|退款|投诉)/.test(title)) return "消费纠纷";
  if (/(偷拍|裙底)/.test(title)) return "违法违规";
  if (/(谣言|造谣|被罚)/.test(title)) return "谣言处罚";
  if (/(翻车|争议|道歉)/.test(title)) return "舆情争议";
  if (/(调查|违规|违法)/.test(title)) return "合规风险";
  if (/(事故|食品安全|医疗)/.test(title)) return "安全风险";
  return "谨慎跟进";
}

function valueReason(title: string) {
  if (/(旅行|美景|赛里木湖|日照金山|古诗词)/.test(title)) return "旅行种草";
  if (/(拍照|出片|海鸥雨)/.test(title)) return "视觉内容";
  if (/(美食|教程|get)/i.test(title)) return "教程清单";
  if (/(礼物|520)/.test(title)) return "节点送礼";
  if (/(卸妆|练妆|穿搭|护肤|测评)/.test(title)) return "美妆穿搭";
  if (/(新品|新口味|好物)/.test(title)) return "新品体验";
  return "可内容化";
}

function platformName(platform: string) {
  return platforms.find((item) => item.id === platform)?.label || platform;
}
