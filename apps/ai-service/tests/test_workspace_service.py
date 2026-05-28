from typing import Any

from src.services import workspace_service


class FakeResponse:
    content = b'{"success": true}'

    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self._data


def test_workspace_client_uses_gateway_base_url_for_calendar_reads(monkeypatch) -> None:
    calls: dict[str, Any] = {}

    def fake_get(url: str, **kwargs: Any) -> FakeResponse:
        calls["url"] = url
        calls["kwargs"] = kwargs
        return FakeResponse({"items": []})

    monkeypatch.setattr(workspace_service.settings, "GATEWAY_URL", "http://gateway.local")
    monkeypatch.setattr(workspace_service.settings, "WORKSPACE_API_BASE_URL", None)
    monkeypatch.setattr(workspace_service.httpx, "get", fake_get)

    items = workspace_service.list_calendar_items(
        "Bearer token",
        start_at="2026-06-01T00:00:00Z",
        end_at="2026-06-30T23:59:59Z",
    )

    assert items == []
    assert calls["url"] == "http://gateway.local/api/calendar/items"
    assert calls["kwargs"]["params"] == {
        "from": "2026-06-01T00:00:00Z",
        "to": "2026-06-30T23:59:59Z",
    }


def test_workspace_client_sends_mail_through_gateway(monkeypatch) -> None:
    calls: dict[str, Any] = {}

    def fake_post(url: str, **kwargs: Any) -> FakeResponse:
        calls["url"] = url
        calls["kwargs"] = kwargs
        return FakeResponse({"success": True})

    monkeypatch.setattr(workspace_service.settings, "GATEWAY_URL", "http://gateway.local")
    monkeypatch.setattr(workspace_service.settings, "WORKSPACE_API_BASE_URL", None)
    monkeypatch.setattr(workspace_service.httpx, "post", fake_post)

    result = workspace_service.send_mail(
        "Bearer token",
        {"to": ["a@example.com"], "subject": "Hello", "body": "Hi"},
    )

    assert result == {"success": True}
    assert calls["url"] == "http://gateway.local/api/mail/messages/send"
    assert calls["kwargs"]["json"] == {
        "to": ["a@example.com"],
        "subject": "Hello",
        "body": "Hi",
    }
