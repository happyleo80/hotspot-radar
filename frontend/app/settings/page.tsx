"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Settings, Sparkles, UserRound } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { api, UserAccount } from "@/lib/api";

export default function SettingsPage() {
  return (
    <AuthGate>
      <WorkspaceShell active="/settings">
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
    <>
      <section className="relative overflow-hidden rounded-2xl border border-[#dce7fb] bg-gradient-to-r from-[#d8eaff] via-[#eef2ff] to-[#e5d8ff] px-8 py-8">
        <div className="relative z-[1] max-w-3xl">
          <p className="text-sm font-semibold text-blue-600">ACCOUNT SETTINGS</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 lg:text-4xl">账户设置</h1>
          <p className="mt-4 text-sm leading-6 text-slate-700">查看飞书登录身份、头像资料、权限角色和积分账户信息。</p>
        </div>
        <div className="absolute right-10 top-8 hidden h-40 w-40 rounded-[32px] border border-white/70 bg-white/30 shadow-2xl backdrop-blur md:flex md:items-center md:justify-center">
          <Settings className="text-blue-600" size={72} />
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-xl border-[#e4eaf3] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar account={account} />
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">{account?.name || "当前用户"}</h2>
                <p className="mt-1 text-sm text-slate-500">{account?.email || "暂未同步邮箱"}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <Pill icon={<BadgeCheck size={16} />} label="权限角色" value={account?.role || "-"} />
              <Pill icon={<Sparkles size={16} />} label="当前积分" value={`${account?.points_balance ?? 0}`} />
              <Pill icon={<UserRound size={16} />} label="累计消耗" value={`${account?.total_points_used ?? 0}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#e4eaf3] shadow-none">
          <div className="border-b border-[#edf1f6] px-5 py-4"><h2 className="text-base font-semibold">飞书身份信息</h2></div>
          <CardContent className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="用户名" value={account?.name || "-"} />
            <Field label="邮箱" value={account?.email || "-"} />
            <Field label="头像地址" value={account?.avatar_url || "未获取"} />
            <Field label="Open ID" value={account?.open_id || "-"} />
            <Field label="创建时间" value={account ? new Date(account.created_at).toLocaleString() : "-"} />
            <Field label="最近访问" value={account ? new Date(account.last_seen_at).toLocaleString() : "-"} />
          </CardContent>
        </Card>
      </section>
    </>
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

function Avatar({ account }: { account: UserAccount | null }) {
  if (account?.avatar_url) {
    return <img className="h-20 w-20 rounded-2xl object-cover" src={account.avatar_url} alt={account.name} />;
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-500 text-2xl font-semibold text-white">
      {(account?.name || "用").slice(0, 1)}
    </div>
  );
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#edf1f6] bg-[#fafbfe] px-4 py-3 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-500">{icon}{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}
