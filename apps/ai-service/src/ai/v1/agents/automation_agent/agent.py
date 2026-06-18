"""Automation Agent — generates chat messages for automation rules."""

import logging
from datetime import date

from openai import OpenAI
from langchain_openai import ChatOpenAI

from src.core.config import openai_api_key_secret, openai_api_key_value, settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an automation bot for a workspace chat platform called Serenity.
Your job is to generate a chat message based on an instruction and the context provided.

Context:
- Organization: {org_name}
- Trigger: {trigger_type}
{user_line}
{task_line}
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
                api_key=openai_api_key_secret(),
                temperature=0.7,
            )
            if settings.OPENAI_API_KEY
            else None
        )
        self._openai_client = (
            OpenAI(api_key=openai_api_key_value())
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
        task_title: str | None = None,
        task_status: str | None = None,
        use_web_search: bool = False,
    ) -> str:
        if not self._llm or not self._openai_client:
            logger.warning("automation_agent: OPENAI_API_KEY not set")
            return "No AI available."

        today = date.today().strftime("%A, %B %d, %Y")
        user_line = f"- User: {display_name}" if display_name else ""
        message_line = f'- Trigger message: "{message_content}"' if message_content else ""
        if task_title:
            status_part = f" (status: {task_status})" if task_status else ""
            task_line = f"- Task: {task_title}{status_part}"
        else:
            task_line = ""

        prompt = SYSTEM_PROMPT.format(
            org_name=org_name or "the workspace",
            trigger_type=trigger_type or "unknown",
            user_line=user_line,
            task_line=task_line,
            message_line=message_line,
            date=today,
            instruction=instruction,
        )

        try:
            if use_web_search:
                return self._execute_with_web_search(prompt)
            return self._execute_standard(prompt)
        except Exception as exc:
            logger.exception("automation_agent: unexpected error: %s", exc)
            return f"Error: {exc}"

    def _execute_standard(self, prompt: str) -> str:
        response = self._llm.invoke(prompt)  # type: ignore[union-attr]
        result = str(response.content).strip()
        if result.startswith('"') and result.endswith('"') and len(result) > 1:
            result = result[1:-1].strip()
        return result

    def _execute_with_web_search(self, prompt: str) -> str:
        """Use OpenAI's built-in web_search_preview tool to ground the response."""
        response = self._openai_client.responses.create(  # type: ignore[union-attr]
            model="gpt-4o",
            tools=[{"type": "web_search_preview"}],
            input=prompt,
        )
        result = response.output_text.strip()
        if result.startswith('"') and result.endswith('"') and len(result) > 1:
            result = result[1:-1].strip()
        return result


automation_agent = AutomationAgent()
