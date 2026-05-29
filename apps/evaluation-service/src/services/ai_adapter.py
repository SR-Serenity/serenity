import time
from uuid import uuid4

import httpx

from src.api.schemas import AuthContextInput
from src.core.config import settings


async def call_ai_chat(
    user_input: str,
    auth_context: AuthContextInput,
    session_id: str | None = None,
) -> tuple[str, int]:
    """Call ai-service and return (actual_output, latency_ms)."""
    if session_id is None:
        session_id = f"eval-{uuid4()}"

    payload = {
        "sessionId": session_id,
        "messages": [{"role": "user", "content": user_input}],
        "authContext": {
            "orgId": auth_context.org_id,
            "userId": auth_context.user_id,
            "role": auth_context.role,
            "displayName": auth_context.display_name,
            "email": auth_context.email,
            "orgName": auth_context.org_name,
            "orgSlug": auth_context.org_slug,
        },
        "context": {},
    }

    headers = {"Content-Type": "application/json"}
    if settings.INTERNAL_API_TOKEN:
        headers["x-internal-api-token"] = settings.INTERNAL_API_TOKEN
        url = f"{settings.AI_SERVICE_URL}/api/internal/v1/ai/chat"
    else:
        url = f"{settings.AI_SERVICE_URL}/api/ai/chat"

    start = time.monotonic()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    latency_ms = int((time.monotonic() - start) * 1000)
    data = resp.json()
    answer = data.get("answer", "")
    return answer, latency_ms
