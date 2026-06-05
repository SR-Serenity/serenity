"""Shared agent protocol types."""

from typing import Protocol


class StandaloneAgent(Protocol):
    name: str

    def health(self) -> dict[str, str]:
        """Return lightweight agent readiness information."""
        ...
