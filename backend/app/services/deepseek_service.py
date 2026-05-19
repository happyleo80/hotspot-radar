import json
import re

import httpx

from app.database import SessionLocal
from app.services.settings_service import get_effective_deepseek_config


async def deepseek_json(system_prompt: str, user_prompt: str, fallback: dict) -> tuple[dict, dict]:
    db = SessionLocal()
    try:
        config = get_effective_deepseek_config(db)
    finally:
        db.close()
    api_key = config.get("api_key")
    if not api_key:
        return fallback, {"model": "heuristic", "total_tokens": None, "prompt_tokens": None, "completion_tokens": None}

    url = f"{config['base_url'].rstrip('/')}/chat/completions"
    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
        response.raise_for_status()
        data = response.json()

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = _parse_json(content) or fallback
    usage = data.get("usage") or {}
    return parsed, {
        "model": data.get("model") or config["model"],
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
    }


def _parse_json(content: str) -> dict | None:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        text = match.group(0)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None
