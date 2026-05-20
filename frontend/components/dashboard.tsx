"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  Download,
  FileText,
  Folder,
  Home,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Sparkles
} from "lucide-react";
import { api, clearAuthToken, Resonance, Topic, TopicRecommendation, UserAccount } from "@/lib/api";
import { formatHeat } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const platforms = [
  { id: "all", label: "全网" },
  { id: "weibo", label: "微博" },
  { id: "douyin", label: "抖音" },
  { id: "xiaohongshu", label: "小红书" },
  { id: "zhihu", label: "知乎" },
  { id: "bilibili", label: "B站" }
];

export function Dashboard() {
  const [active, setActive] = useState("all");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resonance, setResonance] = useState<Resonance[]>([]);
  const [rising, setRising] = useState<Topic[]>([]);
  const [highValue, setHighValue] = useState<Topic[]>([]);
  const [highRisk, setHighRisk] = useState<Topic[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [analyzedTopicIds, setAnalyzedTopicIds] = useState<Set<number>>(new Set());
  const [brief, setBrief] = useState("");
  const [recommendation, setRecommendation] = useState<TopicRecommendation | null>(null);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function load(platform = active) {
    setLoading(true);
    const [topicResult, resonanceRows, risingRows, valueRows, riskRows, accountRow, recommendationRows] = await Promise.all([
      api.topics(platform === "all" ? undefined : platform)
        .then((rows) => ({ rows, error: "" }))
        .catch((error) => ({ rows: [] as Topic[], error: error instanceof Error ? error.message : "热点列表接口异常" })),
      api.resonance().catch(() => []),
      api.rising().catch(() => []),
      api.highValue().catch(() => []),
      api.highRisk().catch(() => []),
      api.account().catch(() => null),
      api.myRecommendations().catch(() => [])
    ]);
    const fallbackTopics = topicResult.rows.length ? topicResult.rows : topicsFromResonance(resonanceRows, platform);
    setTopics(fallbackTopics);
    setResonance(resonanceRows);
    setRising(risingRows);
    setHighValue(valueRows);
    setHighRisk(riskRows);
    setAccount(accountRow);
    setAnalyzedTopicIds(new Set(recommendationRows.map((item) => item.topic_id)));
    if (!topicResult.rows.length && fallbackTopics.length && topicResult.error) {
      setRefreshMessage(`热点列表接口暂时异常，已用跨平台共振话题兜底展示。${topicResult.error}`);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(active).catch(() => setLoading(false));
  }, [active]);

  async function analyzeTopic(topic: Topic) {
    if (isForbiddenTopic(topic.title)) return;
    setBusy(`analyze-${topic.id}`);
    const result = await api.recommend(topic.id);
    setRecommendation(result);
    setAnalyzedTopicIds((prev) => new Set(prev).add(topic.id));
    await load();
    setBusy("");
  }

  async function generateBrief() {
    setBusy("brief");
    const result = await api.brief();
    setBrief(result.markdown);
    setBusy("");
  }

  async function refreshPageData() {
    setBusy("refresh");
    setRefreshMessage("");
    try {
      const result = await api.collectAll();
      await load();
      setRefreshMessage(`已采集最新热点：${result.total} 条。`);
    } catch {
      await load();
      setRefreshMessage("暂时无法连接热点采集服务，请确认后端 8000 端口已开放，并已使用最新代码重新构建。");
    }
    setBusy("");
  }

  function logout() {
    clearAuthToken();
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[248px] border-r border-[#e7ebf2] bg-white lg:block">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-500 text-white">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-normal">Hot Topic Radar</div>
            <div className="text-xs text-slate-500">热点营销策划工作台</div>
          </div>
        </div>
        <nav className="mt-4 space-y-2 px-3 text-sm">
          <SideLink active icon={<Home size={19} />} label="工作台" />
          <SideLink icon={<Folder size={19} />} label="我的话题库" href="/topics-library" />
          <SideLink icon={<BrainCircuit size={19} />} label="AI营销知识" href="/cases-admin" />
          <SideLink icon={<FileText size={19} />} label="生成记录" href="/records" />
          <SideLink icon={<BarChart3 size={19} />} label="用量统计" href="/usage" />
          <SideLink icon={<Settings size={19} />} label="账户设置" href="/settings" />
        </nav>
      </aside>

      <section className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#e7ebf2] bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-[#dde4ef] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-500"
              placeholder="搜索热点 / 平台 / 品牌 / 案例"
            />
          </div>
          <div className="ml-4 flex items-center gap-4">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-semibold">{account?.name || "当前用户"}</div>
              <div className="text-xs text-slate-500">{account?.points_balance ?? 0} 积分</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-900 to-slate-500" />
            <button onClick={logout} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600">
              <LogOut size={17} /> 退出
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-5 lg:px-8">
          <section className="relative overflow-hidden rounded-2xl border border-[#dce7fb] bg-gradient-to-r from-[#d8eaff] via-[#eef2ff] to-[#e5d8ff] px-8 py-8">
            <div className="relative z-[1] max-w-3xl">
              <p className="text-base font-semibold">你好，{account?.name || "当前用户"}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal lg:text-4xl">把一个热点 Idea，扩展成完整的营销策划逻辑</h1>
              <p className="mt-4 text-sm leading-6 text-slate-700">
                聚合微博、抖音、小红书、知乎、B站热点，自动匹配案例库，生成传播路径、内容矩阵、执行任务和风险边界。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="h-11 bg-blue-600 px-6 hover:bg-blue-700" onClick={refreshPageData} disabled={!!busy}>
                  <RefreshCw size={17} /> 刷新页面数据
                </Button>
                <Button className="h-11 bg-white px-6 text-slate-800 hover:bg-slate-50" onClick={generateBrief} disabled={busy === "brief"}>
                  <Download size={17} /> 生成每日简报
                </Button>
              </div>
              {refreshMessage ? <p className="mt-3 text-xs text-slate-600">{refreshMessage}</p> : null}
            </div>
            <div className="absolute right-10 top-8 hidden h-40 w-40 rounded-[32px] border border-white/70 bg-white/30 shadow-2xl backdrop-blur md:flex md:items-center md:justify-center">
              <BrainCircuit className="text-blue-600" size={72} />
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_45%,rgba(79,70,229,0.22),transparent_32%),radial-gradient(circle_at_40%_70%,rgba(14,165,233,0.18),transparent_30%)]" />
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <Metric title="今日热点" value={topics.length} icon={<Folder size={24} />} />
            <Metric title="跨平台共振" value={resonance.length} icon={<BarChart3 size={24} />} />
            <Metric title="剩余额度" value={account?.points_balance ?? 0} suffix="/ 积分" icon={<Sparkles size={24} />} />
            <Metric title="累计消耗" value={account?.total_points_used ?? 0} suffix="/ 积分" icon={<Sparkles size={24} />} />
          </section>

          <section className="mt-5">
            <div className="flex gap-2 overflow-x-auto">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setActive(platform.id)}
                  className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition ${
                    active === platform.id ? "bg-blue-600 text-white" : "border border-[#e3e8f2] bg-white text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="overflow-hidden rounded-xl border-[#e4eaf3] shadow-none">
              <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
                <h2 className="text-base font-semibold">最近热点话题</h2>
                <span className="text-xs text-slate-500">{loading ? "加载中" : `${topics.length} 条`}</span>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-[#fafbfe] text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3">话题名称</th>
                      <th>平台</th>
                      <th>热度</th>
                      <th>状态</th>
                      <th className="pr-5 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.slice(0, 50).map((topic) => {
                      const forbidden = isForbiddenTopic(topic.title);
                      const analyzed = analyzedTopicIds.has(topic.id) || Boolean(topic.analyses?.length);
                      return (
                      <tr key={topic.id} className="border-t border-[#edf1f6]">
                        <td className="max-w-[420px] px-5 py-3">
                          <a href={`/topics/${topic.id}`} className="line-clamp-1 font-medium text-slate-900 hover:text-blue-600">{topic.title}</a>
                        </td>
                        <td>{platformName(topic.platform)}</td>
                        <td>{formatHeat(topic.heat_score)}</td>
                        <td><Status topic={topic} analyzed={analyzed} /></td>
                        <td className="w-[112px] py-2 pr-5 text-right align-middle">
                          <Button
                            className={`ml-auto h-8 min-w-[76px] bg-white px-3 text-xs ${forbidden ? "text-slate-400" : "text-blue-600 hover:bg-blue-50"}`}
                            onClick={() => analyzeTopic(topic)}
                            disabled={forbidden || busy === `analyze-${topic.id}`}
                          >
                            {forbidden ? "不可分析" : analyzed ? "再分析" : "AI建议"}
                          </Button>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-5">
              <Panel title="跨平台共振">
                {resonance.slice(0, 5).map((item) => (
                  <a key={item.normalized_title} href={`/topics/${item.topics[0]?.id}`} className="block rounded-lg border border-[#edf1f6] p-3 hover:border-blue-200">
                    <div className="flex items-center justify-between gap-3">
                      <span className="line-clamp-1 text-sm font-medium">{item.title}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{item.platform_count} 平台</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.platforms.map(platformName).join(" / ")}</p>
                  </a>
                ))}
              </Panel>
              <Panel title="高营销价值">
                {highValue.slice(0, 5).map((topic) => <CompactTopic key={topic.id} topic={topic} tone="value" />)}
              </Panel>
              <Panel title="高风险话题">
                {highRisk.slice(0, 5).map((topic) => <CompactTopic key={topic.id} topic={topic} tone="risk" />)}
              </Panel>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card className="rounded-xl border-[#e4eaf3] shadow-none">
              <div className="border-b border-[#edf1f6] px-5 py-4"><h2 className="text-base font-semibold">最近生成内容</h2></div>
              <div className="divide-y divide-[#edf1f6]">
                {rising.slice(0, 4).map((topic) => (
                  <div key={topic.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm">
                    <span className="line-clamp-1">{topic.title}</span>
                    <span className="text-xs text-slate-500">{platformName(topic.platform)}</span>
                    <a className="rounded-md border border-blue-100 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" href={`/topics/${topic.id}`}>查看</a>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-xl border-[#e4eaf3] shadow-none">
              <div className="border-b border-[#edf1f6] px-5 py-4"><h2 className="text-base font-semibold">AI 推荐结果</h2></div>
              <CardContent>
                {recommendation ? (
                  <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-6 text-white">{recommendation.recommendation}</pre>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">点击任意热点的 AI建议，系统会调用案例库和 Deepseek 生成策划建议。</p>
                )}
              </CardContent>
            </Card>
          </section>

          {brief && (
            <Card className="mt-5 rounded-xl border-[#e4eaf3] shadow-none">
              <div className="border-b border-[#edf1f6] px-5 py-4"><h2 className="text-base font-semibold">每日策划简报 Markdown</h2></div>
              <CardContent>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-6 text-white">{brief}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function SideLink({ icon, label, href, active }: { icon: React.ReactNode; label: string; href?: string; active?: boolean }) {
  const className = `flex h-12 items-center gap-3 rounded-xl px-5 font-medium ${active ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`;
  if (!href) {
    return <div className={className}>{icon}{label}</div>;
  }
  return (
    <a className={className} href={href}>
      {icon}
      {label}
    </a>
  );
}

function Metric({ title, value, icon, suffix }: { title: string; value: number | string; icon: React.ReactNode; suffix?: string }) {
  return (
    <Card className="rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">{value} {suffix && <span className="text-sm font-medium text-slate-500">{suffix}</span>}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-[#e4eaf3] shadow-none">
      <div className="border-b border-[#edf1f6] px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2></div>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function CompactTopic({ topic, tone }: { topic: Topic; tone: "value" | "risk" }) {
  return (
    <a href={`/topics/${topic.id}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-[#edf1f6] p-3 hover:border-blue-200">
      <span className="line-clamp-1 text-sm">{topic.title}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${tone === "risk" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
        {tone === "risk" ? "谨慎" : "可借势"}
      </span>
    </a>
  );
}

function Status({ topic, analyzed }: { topic: Topic; analyzed: boolean }) {
  if (isForbiddenTopic(topic.title)) return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">不可分析</span>;
  if (analyzed) return <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">已分析</span>;
  const risky = highRiskTitle(topic.title);
  if (risky) return <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">谨慎分析</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">可分析</span>;
}

function isForbiddenTopic(title: string) {
  return /(政治|政府|外交|总统|首相|大选|选举|议会|国会|战争|军事|军方|军演|国防|制裁|领土|边境|台湾|香港|澳门|涉政|官员|纪委|反腐|法院|检察院|公安|警方|警察|刑拘|逮捕|判刑|死刑|枪击|恐袭|暴乱|抗议|游行|特朗普|拜登|普京|泽连斯基|以色列|伊朗|乌克兰|俄罗斯|巴勒斯坦|中美)/.test(title);
}

function highRiskTitle(title: string) {
  return /(起诉|退款|投诉|偷拍|违法|谣言|造谣|被罚|翻车|争议|道歉)/.test(title);
}

function platformName(platform: string) {
  return platforms.find((item) => item.id === platform)?.label || platform;
}

function topicsFromResonance(rows: Resonance[], platform: string) {
  const seen = new Set<number>();
  return rows
    .flatMap((item) => item.topics || [])
    .filter((topic) => platform === "all" || topic.platform === platform)
    .filter((topic) => {
      if (seen.has(topic.id)) return false;
      seen.add(topic.id);
      return true;
    })
    .slice(0, 50);
}
