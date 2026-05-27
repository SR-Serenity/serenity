"""Selective long-term memory extraction agent."""


class MemoryWriterAgent:
    name = "MemoryWriterAgent"

    secret_markers = ("token", "password", "secret", "api key")
    memory_markers = ("remember", "prefer", "preference", "always")

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def extract(self, text: str) -> str | None:
        lowered = text.lower()
        if not text or any(secret in lowered for secret in self.secret_markers):
            return None
        if any(marker in lowered for marker in self.memory_markers):
            return text
        return None
