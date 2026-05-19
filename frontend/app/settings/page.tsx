"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { api, UserAccount } from "@/lib/api";

export default function SettingsPage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/settings">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">账户设置</h1>
        <p className="mt-2 text-sm text-slate-500">查看飞书登录身份和积分账户信息。</p>
        <SettingsContent />
      </WorkspaceShell>
    </AuthGate>
  );
}

function SettingsContent() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  useEffect(() => {
    api.account().then(setAccount);
  }, []);
  return (
    <Card className="mt-5 rounded-xl border-[#e4eaf3] shadow-none">
      <CardContent className="grid gap-5 p-5 md:grid-cols-2">
        <Field label="用户名" value={account?.name || "-"} />
        <Field label="邮箱" value={account?.email || "-"} />
        <Field label="当前积分" value={`${account?.points_balance ?? 0}`} />
        <Field label="累计消耗" value={`${account?.total_points_used ?? 0}`} />
        <Field label="Open ID" value={account?.open_id || "-"} />
        <Field label="最近访问" value={account ? new Date(account.last_seen_at).toLocaleString() : "-"} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#edf1f6] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
