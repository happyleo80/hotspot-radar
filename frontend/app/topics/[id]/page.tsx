"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles, TrendingUp } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { RecommendationPreview } from "@/components/recommendation-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, Topic, TopicRecommendation } from "@/lib/api";
import { formatHeat } from "@/lib/utils";
import { highRiskTitle, isForbiddenTopic } from "@/lib/topic-policy";

export default function TopicPage({ params }: { params: { id: string } }) {
  return (
    <AuthGate>
      <TopicDetail topicId={params.id} />
    </AuthGate>
  );
}

function TopicDetail({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [recommendation, setRecommendation] = useState<TopicRecommendation | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.topic(topicId).then((row) => {
      setTopic(row);
      setRecommendation(row.latest_recommendation || null);
    }).catch(() => setTopic(null));
  }, [topicId]);

  async function analyze() {
    if (!topic || isForbiddenTopic(topic.title)) return;
    setBusy(true);
    const row = await api.recommend(topic.id);
    setRecommendation(row);
    const fresh = await api.topic(String(topic.id));
    setTopic(fresh);
    setBusy(false);
  }

  if (!topic) {
    return (
      <WorkspaceShell active="/">
        <p className="text-sm text-slate-500">正在加载话题详情...</p>
      </WorkspaceShell>
    );
  }

  const forbidden = isForbiddenTopic(topic.title);
  const analysis = topic.analyses?.[topic.analyses.length - 1];

  return (
    <WorkspaceShell active="/">
      <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
        <ArrowLeft size={16} /> 返回工作台
      </a>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#dce7fb] bg-gradient-to-r from-[#d8eaff] via-[#eef2ff] to-[#e5d8ff] px-7 py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-600">{platformName(topic.platform)} / 热点话题</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{topic.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Badge>排名 {topic.rank ?? "-"}</Badge>
              <Badge>热度 {formatHeat(topic.heat_score)}</Badge>
              <Badge>{forbidden ? "不可分析" : recommendation ? "已分析" : "可分析"}</Badge>
            </div>
          </div>
          <Button
            className={`h-11 px-5 ${forbidden ? "bg-slate-300 text-white hover:bg-slate-300" : "bg-blue-600 hover:bg-blue-700"}`}
            onClick={analyze}
            disabled={forbidden || busy}
          >
            <Sparkles size={17} /> {forbidden ? "不可分析" : recommendation ? "重新生成 AI 建议" : "生成 AI 建议"}
          </Button>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="grid gap-5">
          <Card className="rounded-xl border-[#e4eaf3] shadow-none">
            <div className="border-b border-[#edf1f6] px-5 py-4">
              <h2 className="text-base font-semibold">基础信息</h2>
            </div>
            <CardContent className="space-y-4 p-5 text-sm text-slate-600">
              <Info label="平台" value={platformName(topic.platform)} />
              <Info label="内容类型" value={topic.content_type || "hot_topic"} />
              <Info label="风险状态" value={forbidden ? "不可分析" : highRiskTitle(topic.title) ? "谨慎分析" : "可分析"} />
              {topic.url ? (
                <a className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700" href={topic.url} target="_blank" rel="noreferrer">
                  查看原始链接 <ExternalLink size={15} />
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#e4eaf3] shadow-none">
            <div className="border-b border-[#edf1f6] px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold"><TrendingUp size={18} /> 热度趋势</h2>
            </div>
            <CardContent className="space-y-3 p-5">
              {(topic.metrics || []).slice(-8).map((metric, index) => (
                <div key={`${metric.collected_at}-${index}`} className="grid grid-cols-[48px_1fr_72px] items-center gap-3 text-xs text-slate-500">
                  <span>#{index + 1}</span>
                  <div className="h-2 rounded-full bg-[#edf1f6]">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, ((metric.heat_score || 0) / (topic.heat_score || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-right">{formatHeat(metric.heat_score)}</span>
                </div>
              ))}
              {!(topic.metrics || []).length ? <p className="text-sm text-slate-500">暂无趋势数据。</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border-[#e4eaf3] shadow-none">
          <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
            <h2 className="text-base font-semibold">AI 营销建议</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${forbidden ? "bg-slate-100 text-slate-500" : recommendation ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
              {forbidden ? "不可分析" : recommendation ? "已分析" : "等待生成"}
            </span>
          </div>
          <CardContent className="p-5">
            {forbidden ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                该话题涉及政治、公共治理、执法司法或其他敏感公共议题，系统不提供营销借势分析。
              </p>
            ) : recommendation ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                  已调用 AI营销知识库生成建议，引用案例 {recommendation.case_refs?.length || 0} 个。
                </div>
                {(recommendation.case_refs || []).length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {recommendation.case_refs?.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#edf1f6] p-4 text-sm">
                        <div className="font-semibold text-slate-950">案例 #{item.case_id} · 匹配 {Math.round((item.match_score || 0) * 100)}%</div>
                        {item.match_reason ? <p className="mt-2 text-slate-600">{item.match_reason}</p> : null}
                        {item.used_insight ? <p className="mt-2 text-xs leading-5 text-slate-500">策略启发：{item.used_insight}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <RecommendationPreview text={recommendation.recommendation} />
              </div>
            ) : analysis ? (
              <div className="grid gap-4 text-sm leading-6 md:grid-cols-2">
                <Field title="一句话摘要" value={analysis.summary} />
                <Field title="为什么火" value={analysis.why_it_trends} />
                <Field title="情绪判断" value={analysis.sentiment} />
                <Field title="风险等级" value={analysis.risk_level} />
                <Field title="营销价值" value={analysis.marketing_value} />
                <Field title="适合借势行业" value={analysis.suitable_industries} />
                <Field title="不适合借势行业" value={analysis.unsuitable_industries} />
                <Field title="品牌借势角度" value={analysis.marketing_angles} />
                <Field title="内容选题建议" value={analysis.content_ideas} />
                <Field title="风险提示" value={analysis.risk_notes} />
              </div>
            ) : (
              <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-slate-600">
                这个话题还没有生成 AI 营销建议。点击右上角按钮后，系统会结合营销案例库和 Deepseek 生成可执行建议。
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </WorkspaceShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/75 px-3 py-1 text-slate-700 shadow-sm">{children}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function Field({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-500">{title}</h2>
      <p className="mt-1 text-slate-900">{value}</p>
    </div>
  );
}

function platformName(platform: string) {
  const names: Record<string, string> = {
    weibo: "微博",
    douyin: "抖音",
    xiaohongshu: "小红书",
    zhihu: "知乎",
    bilibili: "B站"
  };
  return names[platform] || platform;
}
