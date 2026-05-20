"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, Sparkles, Wallet } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { AiUsage, api, TopicRecommendation, UserAccount } from "@/lib/api";

export default function UsagePage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/usage">
        <Usage />
      </WorkspaceShell>
    </AuthGate>
  );
}

function Usage() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  useEffect(() => {
    Promise.all([api.account(), api.myUsage(), api.myRecommendations()]).then(([accountRow, usageRows, recommendationRows]) => {
      setAccount(accountRow);
      setUsage(usageRows);
      setRecommendations(recommendationRows);
    });
  }, []);

  const topicTitles = new Map<number, TopicRecommendation>();
  recommendations.forEach((item) => topicTitles.set(item.topic_id, item));

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-[#dce7fb] bg-gradient-to-r from-[#d8eaff] via-[#eef2ff] to-[#e5d8ff] px-8 py-8">
        <div className="relative z-[1] max-w-3xl">
          <p className="text-sm font-semibold text-blue-600">USAGE CENTER</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 lg:text-4xl">用量统计</h1>
          <p className="mt-4 text-sm leading-6 text-slate-700">查看每个热点话题生成 AI 营销建议时消耗的积分，以及对应的案例知识库调用记录。</p>
        </div>
        <div className="absolute right-10 top-8 hidden h-40 w-40 rounded-[32px] border border-white/70 bg-white/30 shadow-2xl backdrop-blur md:flex md:items-center md:justify-center">
          <BarChart3 className="text-blue-600" size={72} />
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Metric title="当前积分" value={account?.points_balance ?? 0} icon={<Wallet size={24} />} />
        <Metric title="累计消耗" value={account?.total_points_used ?? 0} icon={<Sparkles size={24} />} />
        <Metric title="AI 使用次数" value={usage.length} icon={<Activity size={24} />} />
      </div>
      <Card className="mt-5 overflow-hidden rounded-xl border-[#e4eaf3] shadow-none">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <h2 className="text-base font-semibold">话题积分账单</h2>
          <span className="text-xs text-slate-500">{usage.length} 条</span>
        </div>
        <CardContent className="p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fafbfe] text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3">话题</th>
                <th>用途</th>
                <th>生成时间</th>
                <th className="pr-5 text-right">案例引用</th>
              </tr>
            </thead>
            <tbody>
              {usage.length ? usage.map((item) => {
                const recommendation = item.target_type === "topic" && item.target_id ? topicTitles.get(item.target_id) : undefined;
                return (
                  <tr key={item.id} className="border-t border-[#edf1f6]">
                    <td className="max-w-[460px] px-5 py-4">
                      {recommendation ? (
                        <a className="line-clamp-2 font-semibold text-slate-950 hover:text-blue-600" href={`/topics/${recommendation.topic_id}`}>
                          {recommendation.prompt_topic}
                        </a>
                      ) : (
                        <span className="text-slate-500">{friendlyTarget(item)}</span>
                      )}
                      {recommendation?.case_refs?.length ? (
                        <p className="mt-1 text-xs text-slate-500">引用案例知识库 {recommendation.case_refs.length} 个案例</p>
                      ) : null}
                    </td>
                    <td><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">{friendlyAction(item.action)}</span></td>
                    <td className="text-slate-600">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="pr-5 text-right text-slate-600">{recommendation ? `${recommendation.case_refs?.length || 0} 个案例` : "-"}</td>
                  </tr>
                );
              }) : (
                <tr className="border-t border-[#edf1f6]">
                  <td className="px-5 py-6 text-slate-500" colSpan={4}>暂无 AI 调用记录。</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function friendlyAction(action: string) {
  const actions: Record<string, string> = {
    topic_marketing_recommendation: "热点营销建议",
    topic_analysis: "话题分析",
    daily_brief: "每日简报",
    case_structure: "案例结构化",
    case_embed: "案例向量化"
  };
  return actions[action] || "AI 生成";
}

function friendlyTarget(item: AiUsage) {
  if (item.target_type === "topic") return `话题 #${item.target_id ?? "-"}`;
  if (item.target_type === "case") return `案例 #${item.target_id ?? "-"}`;
  return `${item.target_type || "对象"} #${item.target_id ?? "-"}`;
}


function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
