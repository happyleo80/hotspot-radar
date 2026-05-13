import type { ExtractResult } from "../types";

export async function uploadCollection(apiBase: string, payload: ExtractResult) {
  const response = await fetch(`${apiBase}/api/extension/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`上传失败：${response.status}`);
  }
  return response.json();
}
