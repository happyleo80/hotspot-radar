"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { AiUsage, api, UserAccount } from "@/lib/api";

export default function UsagePage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/usage">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">用量统计</h1>
        <p className="mt-2 text-sm text-slate-500">查看 AI 建议、简报生成等功能的积分消耗明细。</p>
        <Usage />
      </WorkspaceShell>
    </AuthGate>
  );
}

function Usage() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  useEffect(() => {
    Promise.all([api.account(), api.myUsage()]).then(([accountRow, usageRows]) => {
      setAccount(accountRow);
      setUsage(usageRows);
    });
  }, []);
  return (
    <>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Metric title="当前积分" value={account?.points_balance ?? 0} />
        <Metric title="累计消耗" value={account?.total_points_used ?? 0} />
        <Metric title="AI 使用次数" value={usage.length} />
      </div>
      <Card className="mt-5 overflow-hidden rounded-xl border-[#e4eaf3] shadow-none">
        <CardContent className="p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fafbfe] text-xs text-slate-500">
              <tr><th className="px-5 py-3">时间</th><th>动作</th><th>对象</th><th>模型</th><th>积分</th></tr>
            </thead>
            <tbody>
              {usage.map((item) => (
                <tr key={item.id} className="border-t border-[#edf1f6]">
                  <td className="px-5 py-4">{new Date(item.created_at).toLocaleString()}</td>
                  <td>{item.action}</td>
                  <td>{item.target_type} #{item.target_id ?? "-"}</td>
                  <td>{item.model}</td>
                  <td>{item.points_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}
