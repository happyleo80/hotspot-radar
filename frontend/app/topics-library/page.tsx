"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { api, TopicRecommendation } from "@/lib/api";

export default function TopicsLibraryPage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/topics-library">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">我的话题库</h1>
        <p className="mt-2 text-sm text-slate-500">这里保存你点击 AI 建议后的热点话题和策划结果。</p>
        <TopicLibrary />
      </WorkspaceShell>
    </AuthGate>
  );
}

function TopicLibrary() {
  const [items, setItems] = useState<TopicRecommendation[]>([]);
  useEffect(() => {
    api.myRecommendations().then(setItems);
  }, []);
  return (
    <Card className="mt-5 rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="grid gap-4 p-5 md:grid-cols-2">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#edf1f6] p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-950">{item.prompt_topic}</h2>
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">{item.points_used} 积分</span>
            </div>
            <pre className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.recommendation}</pre>
          </article>
        )) : <p className="text-sm text-slate-500">还没有保存的话题。回到工作台点击 AI建议即可生成。</p>}
      </CardContent>
    </Card>
  );
}
