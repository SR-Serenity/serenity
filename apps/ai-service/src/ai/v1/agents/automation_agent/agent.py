"""Automation Agent — generates chat messages for automation rules."""

import logging
from datetime import date

from langchain_openai import ChatOpenAI

from src.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an automation bot for a workspace chat platform called Serenity.
Your job is to generate a chat message based on an instruction and the context provided.

Context:
- Organization: {org_name}
- Trigger: {trigger_type}
{user_line}
{message_line}
- Today's date: {date}

Instruction:
{instruction}

Write ONLY the message content. No surrounding quotes, no explanation, no metadata. Just the message."""


class AutomationAgent:
    name = "AutomationAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
            )
            if settings.OPENAI_API_KEY
            else None
        )

    def execute(
        self,
        *,
        instruction: str,
        org_name: str | None = None,
        trigger_type: str | None = None,
        display_name: str | None = None,
        message_content: str | None = None,
    ) -> str:
        if not self._llm:
            logger.warning("automation_agent: OPENAI_API_KEY not set")
            return "No AI available."

        today = date.today().strftime("%A, %B %d, %Y")
        user_line = f"- User: {display_name}" if display_name else ""
        message_line = f'- Trigger message: "{message_content}"' if message_content else ""

        prompt = SYSTEM_PROMPT.format(
            org_name=org_name or "the workspace",
            trigger_type=trigger_type or "unknown",
            user_line=user_line,
            message_line=message_line,
            date=today,
            instruction=instruction,
        )

        try:
            response = self._llm.invoke(prompt)
            result = str(response.content).strip()
            if result.startswith('"') and result.endswith('"') and len(result) > 1:
                result = result[1:-1].strip()
            return result
        except Exception as exc:
            logger.exception("automation_agent: unexpected error: %s", exc)
            return f"Error: {exc}"


automation_agent = AutomationAgent()
