"use client";

import { useEffect, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { api, AuthUser, clearAuthToken, getAuthToken, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserWatermark } from "@/components/user-watermark";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("auth_token");
    if (token) {
      setAuthToken(token);
      url.searchParams.delete("auth_token");
      window.history.replaceState({}, "", url.toString());
    }

    async function checkAuth() {
      try {
        const config = await api.authConfig();
        setRequired(config.auth_required);
        setConfigured(config.feishu_configured || !config.auth_required);
        const result = await api.me();
        setUser(result.user);
      } catch {
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login() {
    const result = await api.loginUrl(window.location.origin + window.location.pathname);
    window.location.href = result.url;
  }

  if (loading) {
    return <AuthShell title="正在校验登录状态" description="正在连接飞书身份服务..." />;
  }

  if (required && !configured) {
    return (
      <AuthShell
        title="飞书登录未配置"
        description="请在后端环境变量中配置 FEISHU_APP_ID、FEISHU_APP_SECRET 和 FEISHU_REDIRECT_URI。"
      />
    );
  }

  if (required && !user && !getAuthToken()) {
    return (
      <AuthShell title="请使用飞书账号登录" description="登录后才能访问 Trustwin 热点话题雷达。">
        <Button className="bg-teal hover:bg-teal/90" onClick={login}>
          <LogIn size={16} /> 飞书账号登录
        </Button>
      </AuthShell>
    );
  }

  return (
    <>
      {children}
      <UserWatermark user={user} />
    </>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <main className="radar-grid flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Trustwin 君信品牌管理</p>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-ink/60">{description}</p>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
