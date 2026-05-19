"use client";

import { AuthUser } from "@/lib/api";

export function UserWatermark({ user }: { user: AuthUser | null }) {
  const identity = user?.name || user?.email || user?.open_id || "未识别用户";
  const date = new Date().toLocaleDateString("zh-CN");
  const text = `${identity} · ${date}`;
  const rows = Array.from({ length: 24 }, (_, index) => index);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2147483647] overflow-hidden opacity-[0.16] mix-blend-multiply">
      <div className="absolute left-1/2 top-1/2 grid w-[190vw] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] grid-cols-2 gap-x-24 gap-y-24 text-[14px] font-normal text-slate-700 sm:grid-cols-3 sm:gap-x-32 sm:gap-y-28 sm:text-[15px] lg:grid-cols-4 lg:gap-x-40 lg:gap-y-32">
        {rows.map((row) => (
          <span key={row} className="whitespace-nowrap tracking-normal">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
