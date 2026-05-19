"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { api, TopicRecommendation } from "@/lib/api";

export default function RecordsPage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/records">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">生成记录</h1>
        <p className="mt-2 text-sm text-slate-500">按时间查看每一次 AI 建议生成记录。</p>
        <Records />
      </WorkspaceShell>
    </AuthGate>
  );
}

function Records() {
  const [items, setItems] = useState<TopicRecommendation[]>([]);
  useEffect(() => {
    api.myRecommendations().then(setItems);
  }, []);
  return (
    <Card className="mt-5 overflow-hidden rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#fafbfe] text-xs text-slate-500">
            <tr><th className="px-5 py-3">生成时间</th><th>话题</th><th>模型</th><th>积分</th><th>操作</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#edf1f6]">
                <td className="px-5 py-4">{new Date(item.created_at).toLocaleString()}</td>
                <td className="max-w-[420px]"><span className="line-clamp-1">{item.prompt_topic}</span></td>
                <td>{item.model}</td>
                <td>{item.points_used}</td>
                <td><a className="rounded-md border border-blue-100 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" href={`/topics/${item.topic_id}`}>查看</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
