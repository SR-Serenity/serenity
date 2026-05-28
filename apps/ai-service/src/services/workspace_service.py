"""HTTP client for calling workspace APIs through the gateway."""

import logging
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 60.0


def _base_url() -> str:
    configured = settings.WORKSPACE_API_BASE_URL
    if configured:
        return configured.rstrip("/")
    return f"{settings.GATEWAY_URL.rstrip('/')}/api"


def _headers(auth_token: str) -> dict[str, str]:
    return {"authorization": auth_token, "content-type": "application/json"}


def _get(path: str, auth_token: str, params: dict | None = None) -> Any:
    url = f"{_base_url()}/{path}"
    try:
        r = httpx.get(url, headers=_headers(auth_token), params=params, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("workspace-api GET %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("workspace-api GET %s failed: %s", path, e)
        raise


def _post(path: str, auth_token: str, body: dict) -> Any:
    url = f"{_base_url()}/{path}"
    try:
        r = httpx.post(url, headers=_headers(auth_token), json=body, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("workspace-api POST %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("workspace-api POST %s failed: %s", path, e)
        raise


def _patch(path: str, auth_token: str, body: dict) -> Any:
    url = f"{_base_url()}/{path}"
    try:
        r = httpx.patch(url, headers=_headers(auth_token), json=body, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("workspace-api PATCH %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("workspace-api PATCH %s failed: %s", path, e)
        raise


def _delete(path: str, auth_token: str) -> Any:
    url = f"{_base_url()}/{path}"
    try:
        r = httpx.delete(url, headers=_headers(auth_token), timeout=_TIMEOUT)
        r.raise_for_status()
        if not r.content:
            return {"success": True}
        return r.json()
    except httpx.HTTPStatusError as e:
        logger.warning("workspace-api DELETE %s → %s", path, e.response.status_code)
        raise
    except Exception as e:
        logger.error("workspace-api DELETE %s failed: %s", path, e)
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


# ── Organization ──────────────────────────────────────────────────────────────

def get_current_member(auth_token: str, org_id: str, user_id: str) -> dict | None:
    try:
        data = _get(f"organizations/{org_id}/members", auth_token)
        members = data.get("members", []) if isinstance(data, dict) else []
        for member in members:
            if member.get("id") == user_id:
                return member
    except Exception:
        return None
    return None


# ── Calendar ──────────────────────────────────────────────────────────────────

def list_calendar_items(
    auth_token: str,
    start_at: str | None = None,
    end_at: str | None = None,
) -> list[dict]:
    params: dict = {}
    if start_at:
        params["from"] = start_at
    if end_at:
        params["to"] = end_at
    data = _get("calendar/items", auth_token, params=params or None)
    return data.get("items", []) if isinstance(data, dict) else []


def create_calendar_item(auth_token: str, body: dict) -> dict:
    data = _post("calendar/items", auth_token, body)
    return data if isinstance(data, dict) else {}


def update_calendar_item(auth_token: str, item_id: str, body: dict) -> dict:
    data = _patch(f"calendar/items/{item_id}", auth_token, body)
    return data if isinstance(data, dict) else {}


def delete_calendar_item(auth_token: str, item_id: str) -> dict:
    data = _delete(f"calendar/items/{item_id}", auth_token)
    return data if isinstance(data, dict) else {"success": True}


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


def send_mail(auth_token: str, body: dict) -> dict:
    data = _post("mail/messages/send", auth_token, body)
    return data if isinstance(data, dict) else {}
