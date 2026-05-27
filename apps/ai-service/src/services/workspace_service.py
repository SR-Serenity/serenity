"""HTTP client for calling the core-service workspace APIs."""

import logging
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 10.0


def _headers(auth_token: str) -> dict[str, str]:
    return {"authorization": auth_token, "content-type": "application/json"}


def _get(path: str, auth_token: str, params: dict | None = None) -> Any:
    url = f"{settings.CORE_SERVICE_BASE_URL}/{path}"
    try:
        r = httpx.get(url, headers=_headers(auth_token), params=params, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("core-service GET %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("core-service GET %s failed: %s", path, e)
        raise


def _post(path: str, auth_token: str, body: dict) -> Any:
    url = f"{settings.CORE_SERVICE_BASE_URL}/{path}"
    try:
        r = httpx.post(url, headers=_headers(auth_token), json=body, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("core-service POST %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("core-service POST %s failed: %s", path, e)
        raise


# ── Wiki ──────────────────────────────────────────────────────────────────────

def list_wiki_pages(auth_token: str) -> list[dict]:
    data = _get("wiki/pages", auth_token)
    return data.get("pages", []) if isinstance(data, dict) else []


def get_wiki_page(auth_token: str, page_id: str) -> dict | None:
    try:
        return _get(f"wiki/pages/{page_id}", auth_token)
    except Exception:
        return None


# ── Chat ──────────────────────────────────────────────────────────────────────

def list_conversations(auth_token: str) -> list[dict]:
    data = _post("chat/conversations/list", auth_token, {})
    return data.get("conversations", []) if isinstance(data, dict) else []


def list_messages(auth_token: str, conversation_id: str, limit: int = 50) -> list[dict]:
    data = _post(
        f"chat/conversations/{conversation_id}/messages/list",
        auth_token,
        {"limit": limit},
    )
    return data.get("messages", []) if isinstance(data, dict) else []


# ── Contacts ──────────────────────────────────────────────────────────────────

def list_contacts(auth_token: str) -> list[dict]:
    data = _get("contacts", auth_token)
    return data.get("contacts", []) if isinstance(data, dict) else []


# ── Calendar ──────────────────────────────────────────────────────────────────

def list_calendar_items(
    auth_token: str,
    start_at: str | None = None,
    end_at: str | None = None,
) -> list[dict]:
    params: dict = {}
    if start_at:
        params["startAt"] = start_at
    if end_at:
        params["endAt"] = end_at
    data = _get("calendar/items", auth_token, params=params or None)
    return data.get("items", []) if isinstance(data, dict) else []


# ── Mail ──────────────────────────────────────────────────────────────────────

def list_mail_accounts(auth_token: str) -> list[dict]:
    try:
        data = _get("mail/accounts", auth_token)
        return data.get("accounts", []) if isinstance(data, dict) else []
    except Exception:
        return []


def list_mail_threads(auth_token: str, limit: int = 20) -> list[dict]:
    try:
        data = _get("mail/threads", auth_token, params={"limit": limit})
        return data.get("threads", []) if isinstance(data, dict) else []
    except Exception:
        return []


def get_mail_thread(auth_token: str, thread_id: str) -> dict | None:
    try:
        return _get(f"mail/threads/{thread_id}", auth_token)
    except Exception:
        return None
