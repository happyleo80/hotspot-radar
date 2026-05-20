"use client";

import { useEffect, useState } from "react";
import { BarChart3, BrainCircuit, Folder, LogOut, Search, Settings, Sparkles } from "lucide-react";
import { api, clearAuthToken, UserAccount } from "@/lib/api";

const primaryNavItems = [
  { href: "/topics-library", label: "我的话题库", icon: <Folder size={19} /> },
  { href: "/usage", label: "用量统计", icon: <BarChart3 size={19} /> }
];

const moduleNavItems = [
  { href: "/cases-admin", label: "AI营销知识", icon: <BrainCircuit size={19} /> }
];

const bottomNavItems = [
  { href: "/settings", label: "账户设置", icon: <Settings size={19} /> }
];

export function WorkspaceShell({ active, children }: { active: string; children: React.ReactNode }) {
  const [account, setAccount] = useState<UserAccount | null>(null);

  useEffect(() => {
    api.account().then(setAccount).catch(() => setAccount(null));
  }, []);

  function logout() {
    clearAuthToken();
    window.location.href = "/";
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
        <nav className="mt-4 flex h-[calc(100vh-112px)] flex-col px-3 text-sm">
          <div className="space-y-2">
            {primaryNavItems.map((item) => (
              <SideNavItem key={item.label} item={item} active={active} />
            ))}
            <div className="px-5 pb-1 pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">功能模块</div>
            {moduleNavItems.map((item) => (
              <SideNavItem key={item.label} item={item} active={active} />
            ))}
          </div>
          <div className="mt-auto border-t border-[#eef2f7] pt-3">
            {bottomNavItems.map((item) => (
              <SideNavItem key={item.label} item={item} active={active} />
            ))}
          </div>
        </nav>
      </aside>
      <section className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#e7ebf2] bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-[#dde4ef] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-500"
              placeholder="搜索热点 / 记录 / 设置"
            />
          </div>
          <div className="ml-4 flex items-center gap-4">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-semibold">{account?.name || "当前用户"}</div>
              <div className="text-xs text-slate-500">{account?.points_balance ?? 0} 积分</div>
            </div>
            <Avatar account={account} />
            <button onClick={logout} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600">
              <LogOut size={17} /> 退出
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-5 lg:px-8">{children}</div>
      </section>
    </main>
  );
}

function SideNavItem({
  item,
  active
}: {
  item: { href: string; label: string; icon: React.ReactNode };
  active: string;
}) {
  return (
    <a
      className={`flex h-12 items-center gap-3 rounded-xl px-5 font-medium ${active === item.href ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
      href={item.href}
    >
      {item.icon}
      {item.label}
    </a>
  );
}

function Avatar({ account }: { account: UserAccount | null }) {
  if (account?.avatar_url) {
    return <img className="h-10 w-10 rounded-full object-cover" src={account.avatar_url} alt={account.name} />;
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-500 text-sm font-semibold text-white">
      {(account?.name || "用").slice(0, 1)}
    </div>
  );
}
