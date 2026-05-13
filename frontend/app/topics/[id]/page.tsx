"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Topic } from "@/lib/api";
import { formatHeat } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TopicPage({ params }: { params: { id: string } }) {
  const [topic, setTopic] = useState<Topic | null>(null);

  useEffect(() => {
    api.topic(params.id).then(setTopic).catch(() => setTopic(null));
  }, [params.id]);

  if (!topic) {
    return (
      <main className="min-h-screen bg-mist px-4 py-6">
        <div className="mx-auto max-w-5xl text-sm text-ink/60">正在加载话题详情...</div>
      </main>
    );
  }

  const analysis = topic.analyses?.[topic.analyses.length - 1];

  return (
    <main className="min-h-screen bg-mist px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-teal">返回 Dashboard</Link>
        <div className="mt-4">
          <h1 className="text-3xl font-semibold tracking-normal text-ink">{topic.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink/60">
            <span>{topic.platform}</span>
            <span>排名 {topic.rank ?? "-"}</span>
            <span>热度 {formatHeat(topic.heat_score)}</span>
            <span>首次出现 {new Date(topic.first_seen_at).toLocaleString()}</span>
            <span>最近更新 {new Date(topic.last_seen_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader><CardTitle>基础信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p>链接：{topic.url ? <a className="text-teal" href={topic.url}>{topic.url}</a> : "暂无"}</p>
              <p>内容类型：{topic.content_type || "hot_topic"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>热度趋势</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(topic.metrics || []).slice(-8).map((metric, index) => (
                  <div key={`${metric.collected_at}-${index}`} className="grid grid-cols-[120px_1fr_70px] items-center gap-3 text-xs">
                    <span>{new Date(metric.collected_at).toLocaleTimeString()}</span>
                    <div className="h-2 rounded bg-line">
                      <div className="h-2 rounded bg-teal" style={{ width: `${Math.min(100, ((metric.heat_score || 0) / (topic.heat_score || 1)) * 100)}%` }} />
                    </div>
                    <span>{formatHeat(metric.heat_score)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader><CardTitle>AI 营销分析</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 md:grid-cols-2">
            {analysis ? (
              <>
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
              </>
            ) : (
              <p className="text-ink/60">尚未生成 AI 分析，请回到 Dashboard 点击 AI 按钮。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-ink/50">{title}</h2>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}
