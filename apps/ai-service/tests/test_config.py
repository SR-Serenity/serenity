from pathlib import Path

from src.core.config import ENV_FILE


def test_env_file_is_ai_service_local() -> None:
    expected = Path(__file__).resolve().parents[1] / ".env"
    assert ENV_FILE == expected
    assert ENV_FILE.name == ".env"
    assert "apps/ai-service" in str(ENV_FILE)
