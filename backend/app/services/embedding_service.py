import hashlib
import math

import httpx
from sqlalchemy.orm import Session

from app.services.settings_service import get_effective_embedding_config


def embed_text(db: Session, text: str) -> tuple[list[float], dict]:
    config = get_effective_embedding_config(db)
    provider = (config.get("provider") or "mock").lower()
    dimension = int(config.get("dimension") or 1024)
    if provider == "mock" or not config.get("enabled"):
        return _mock_embedding(text, dimension), {"provider": "mock", "model": "mock", "dimension": dimension}
    if provider in {"zhipu", "openai", "xinference_bge_m3"}:
        return _openai_compatible_embedding(text, config)
    raise ValueError(f"Unsupported embedding provider: {provider}")


def test_embedding_connection(db: Session, text: str) -> dict:
    vector, meta = embed_text(db, text or "测试向量模型连接")
    return {
        "ok": True,
        "provider": meta.get("provider"),
        "model": meta.get("model"),
        "dimension": len(vector),
    }


def _openai_compatible_embedding(text: str, config: dict) -> tuple[list[float], dict]:
    api_key = config.get("api_key")
    if not api_key:
        raise ValueError("Embedding API key is not configured")
    base_url = (config.get("base_url") or "").rstrip("/")
    if not base_url:
        raise ValueError("Embedding base URL is not configured")
    payload = {"model": config.get("model"), "input": text[:8000]}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30) as client:
        response = client.post(base_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    vector = data.get("data", [{}])[0].get("embedding")
    if not isinstance(vector, list):
        raise ValueError("Embedding response does not contain data[0].embedding")
    return [float(item) for item in vector], {
        "provider": config.get("provider"),
        "model": data.get("model") or config.get("model"),
        "dimension": len(vector),
    }


def _mock_embedding(text: str, dimension: int) -> list[float]:
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    values = []
    for index in range(dimension):
        byte = seed[index % len(seed)]
        values.append((byte / 127.5) - 1)
    norm = math.sqrt(sum(value * value for value in values)) or 1
    return [round(value / norm, 6) for value in values]
