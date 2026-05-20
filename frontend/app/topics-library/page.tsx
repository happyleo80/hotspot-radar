"use client";

import { useEffect, useState } from "react";
import { BookOpen, BrainCircuit, Folder, Sparkles, Star } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { RecommendationPreview } from "@/components/recommendation-preview";
import { api, TopicRecommendation } from "@/lib/api";

export default function TopicsLibraryPage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/topics-library">
        <TopicLibrary />
      </WorkspaceShell>
    </AuthGate>
  );
}

function TopicLibrary() {
  const [items, setItems] = useState<TopicRecommendation[]>([]);
  const [filter, setFilter] = useState<"all" | "favorite">("all");
  useEffect(() => {
    api.myRecommendations().then(setItems);
  }, []);

  const caseRefCount = items.reduce((sum, item) => sum + (item.case_refs?.length || 0), 0);
  const favoriteCount = items.filter((item) => item.is_favorite).length;
  const visibleItems = filter === "favorite" ? items.filter((item) => item.is_favorite) : items;

  async function toggleFavorite(item: TopicRecommendation) {
    const next = item.is_favorite ? 0 : 1;
    setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, is_favorite: next } : row));
    try {
      const updated = await api.updateRecommendationFavorite(item.id, Boolean(next));
      setItems((rows) => rows.map((row) => row.id === item.id ? updated : row));
    } catch {
      setItems((rows) => rows.map((row) => row.id === item.id ? item : row));
    }
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-[#dce7fb] bg-gradient-to-r from-[#d8eaff] via-[#eef2ff] to-[#e5d8ff] px-8 py-8">
        <div className="relative z-[1] max-w-3xl">
          <p className="text-sm font-semibold text-blue-600">HOT TOPIC LIBRARY</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 lg:text-4xl">我的话题库</h1>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            这里保存你点击 AI 建议后的热点话题、策划结论和案例知识库引用，方便继续扩展成内容方案或客户提案。
          </p>
        </div>
        <div className="absolute right-10 top-8 hidden h-40 w-40 rounded-[32px] border border-white/70 bg-white/30 shadow-2xl backdrop-blur md:flex md:items-center md:justify-center">
          <BrainCircuit className="text-blue-600" size={72} />
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Metric title="已分析话题" value={items.length} icon={<Folder size={24} />} />
        <Metric title="引用案例" value={caseRefCount} icon={<BookOpen size={24} />} />
        <Metric title="已收藏" value={favoriteCount} icon={<Star size={24} />} />
      </section>

      <Card className="mt-5 rounded-xl border-[#e4eaf3] shadow-none">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">AI 话题策划记录</h2>
            <p className="mt-1 text-xs text-slate-500">{filter === "favorite" ? `已收藏 ${favoriteCount} 条` : `全部 ${items.length} 条`}</p>
          </div>
          <div className="flex rounded-xl border border-[#e2e8f0] bg-white p-1 text-sm">
            <button
              className={`h-9 rounded-lg px-4 font-medium ${filter === "all" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setFilter("all")}
            >
              全部
            </button>
            <button
              className={`h-9 rounded-lg px-4 font-medium ${filter === "favorite" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setFilter("favorite")}
            >
              已收藏
            </button>
          </div>
        </div>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          {visibleItems.length ? visibleItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#edf1f6] bg-white p-5 transition hover:border-blue-200 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">{item.prompt_topic}</h2>
                <button
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${item.is_favorite ? "border-amber-200 bg-amber-50 text-amber-500" : "border-[#e6ebf3] bg-white text-slate-400 hover:border-amber-200 hover:text-amber-500"}`}
                  onClick={() => toggleFavorite(item)}
                  title={item.is_favorite ? "取消收藏" : "收藏话题"}
                >
                  <Star size={17} fill={item.is_favorite ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">引用案例 {item.case_refs?.length || 0}</span>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <RecommendationPreview text={item.recommendation} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <a className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700" href={`/topics/${item.topic_id}`}>查看话题详情</a>
                <span className="text-xs text-slate-400">每次分析消耗 10 积分</span>
              </div>
            </article>
          )) : <p className="text-sm text-slate-500">{filter === "favorite" ? "还没有收藏的话题。点击卡片右上角星标即可收藏。" : "还没有保存的话题。回到首页点击 AI建议即可生成。"}</p>}
        </CardContent>
      </Card>
    </>
  );
}

function Metric({ title, value, icon, suffix }: { title: string; value: number; icon: React.ReactNode; suffix?: string }) {
  return (
    <Card className="rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">{value} {suffix ? <span className="text-sm font-medium text-slate-500">{suffix}</span> : null}</p>
        </div>
      </CardContent>
    </Card>
  );
}
