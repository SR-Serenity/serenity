from src.integrations import langfuse


def test_langfuse_callback_disabled_without_keys(monkeypatch) -> None:
    monkeypatch.setattr(langfuse.settings, "LANGFUSE_PUBLIC_KEY", None)
    monkeypatch.setattr(langfuse.settings, "LANGFUSE_SECRET_KEY", None)

    assert langfuse.langfuse_enabled() is False
    assert langfuse.langfuse_callback_handler() is None
    assert langfuse.callbacks() == []


def test_langfuse_callback_attempted_with_keys(monkeypatch) -> None:
    monkeypatch.setattr(langfuse.settings, "LANGFUSE_PUBLIC_KEY", "pk")
    monkeypatch.setattr(langfuse.settings, "LANGFUSE_SECRET_KEY", "sk")

    assert langfuse.langfuse_enabled() is True
