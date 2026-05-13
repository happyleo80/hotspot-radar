import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "热点话题雷达",
  description: "面向营销策划的跨平台热点监测与 AI 分析系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
