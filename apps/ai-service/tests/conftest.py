import pytest

from src.core.config import settings


@pytest.fixture(autouse=True)
def disable_external_llm_calls(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
