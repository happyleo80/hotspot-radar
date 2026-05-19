"use client";

import { useEffect } from "react";

export default function AccountPage() {
  useEffect(() => {
    window.location.replace("/topics-library");
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-6 py-8 text-sm text-slate-500">
      正在打开我的话题库...
    </main>
  );
}
