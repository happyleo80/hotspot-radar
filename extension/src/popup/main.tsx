import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { uploadCollection } from "../services/api";
import type { ExtractResult } from "../types";
import "./styles.css";

function Popup() {
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [apiBase, setApiBase] = useState("http://localhost:8000");
  const [status, setStatus] = useState("只采集当前页面可见内容，不读取 Cookie、Token 或账号密码。");

  async function collect() {
    setStatus("正在解析当前标签页...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      const response = await chrome.tabs.sendMessage(tab.id, { type: "HOTSPOT_RADAR_EXTRACT" });
      setResult(response);
      setStatus(`已识别 ${response.platform}，可预览 ${response.items.length} 条。`);
    } catch {
      setStatus("当前页面未注入采集脚本，请确认打开的是五个平台的页面后重试。");
    }
  }

  async function upload() {
    if (!result) return;
    try {
      setStatus("正在上传...");
      const data = await uploadCollection(apiBase, result);
      setStatus(`上传成功：${data.count} 条已进入后台。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "上传失败，请检查后台服务。");
    }
  }

  return (
    <main>
      <h1>热点雷达采集助手</h1>
      <label>
        后台地址
        <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
      </label>
      <p>{status}</p>
      <div className="actions">
        <button onClick={collect}>采集当前页面</button>
        <button onClick={upload} disabled={!result}>确认上传</button>
      </div>
      {result && (
        <section>
          <div className="meta">{result.platform} / {result.page_url}</div>
          <ul>
            {result.items.map((item) => (
              <li key={`${item.rank}-${item.title}`}>
                <span>{item.rank}</span>
                <strong>{item.title}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
