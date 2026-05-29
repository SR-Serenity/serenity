import time
from uuid import uuid4

import httpx

from src.api.schemas import AuthContextInput
from src.core.config import settings


async def call_ai_chat(
    user_input: str,
    auth_context: AuthContextInput,
    feature: str,
    case: dict,
    session_id: str | None = None,
) -> tuple[str, int]:
    """Call the correct agent endpoint in ai-service based on the feature, and return (actual_output, latency_ms)."""
    if session_id is None:
        session_id = f"eval-{uuid4()}"

    headers = {"Content-Type": "application/json"}
    if settings.INTERNAL_API_TOKEN:
        headers["x-internal-api-token"] = settings.INTERNAL_API_TOKEN
    if auth_context.auth_token:
        token = auth_context.auth_token
        if not token.startswith("Bearer "):
            token = f"Bearer {token}"
        headers["Authorization"] = token

    # Determine endpoint and payload based on feature
    if feature == "wiki_editor":
        url = f"{settings.AI_SERVICE_URL}/api/internal/v1/ai/wiki/edit"
        payload = {
            "authContext": {
                "orgId": auth_context.org_id,
                "userId": auth_context.user_id,
                "role": auth_context.role,
                "displayName": auth_context.display_name,
                "email": auth_context.email,
                "orgName": auth_context.org_name,
                "orgSlug": auth_context.org_slug,
            },
            "pageId": case.get("page_id") or "eval-page-id",
            "pageTitle": case.get("page_title") or "Eval Page",
            "pageContentMarkdown": case.get("page_content_markdown") or "",
            "prompt": user_input,
            "orgSlug": auth_context.org_slug,
        }
    elif feature == "chat_assistant":
        url = f"{settings.AI_SERVICE_URL}/api/internal/v1/ai/chat/assist"
        payload = {
            "authContext": {
                "orgId": auth_context.org_id,
                "userId": auth_context.user_id,
                "role": auth_context.role,
                "displayName": auth_context.display_name,
                "email": auth_context.email,
                "orgName": auth_context.org_name,
                "orgSlug": auth_context.org_slug,
            },
            "conversationContext": case.get("conversation_context") or [],
            "prompt": user_input,
        }
    else:
        # Standard chat endpoint for workspace_qa, task_creator, meeting_scheduler
        if settings.INTERNAL_API_TOKEN:
            url = f"{settings.AI_SERVICE_URL}/api/internal/v1/ai/chat"
        else:
            url = f"{settings.AI_SERVICE_URL}/api/ai/chat"
        
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

    start = time.monotonic()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    latency_ms = int((time.monotonic() - start) * 1000)
    data = resp.json()

    if feature == "wiki_editor":
        # Combine explanation (answer) and updated markdown for verification
        answer = data.get("answer", "")
        updated_md = data.get("updatedContentMarkdown")
        if updated_md:
            answer = f"{answer}\n\n[UPDATED CONTENT]:\n{updated_md}"
    elif feature == "chat_assistant":
        answer = data.get("suggestedContent", "")
    else:
        answer = data.get("answer", "")

    return answer, latency_ms
