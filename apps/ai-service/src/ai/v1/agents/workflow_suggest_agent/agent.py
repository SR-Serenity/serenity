"""Workflow Suggest Agent — converts a plain-English description into a stepsGraph."""

import logging
from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from src.core.config import settings

logger = logging.getLogger(__name__)

TriggerType = Literal[
    "SCHEDULE",
    "MEMBER_JOINED",
    "MESSAGE_KEYWORD",
    "TASK_CREATED",
    "TASK_STATUS_CHANGED",
    "TASK_ASSIGNED",
]

ActionType = Literal[
    "AI_AGENT",
    "NOTIFY",
    "CREATE_TASK",
    "POST_CHANNEL",
]

SYSTEM_PROMPT = """\
You are an automation workflow designer for a workspace platform called Serenity.
A user will describe an automation workflow in plain English. Your job is to convert
that description into a structured workflow graph.

Available trigger types:
- SCHEDULE: Runs at a set time. Config: { "frequency": "daily"|"weekly", "time": "HH:MM", "cron": "<cron expr>" }
- MEMBER_JOINED: Fires when a new member joins. Config: {}
- MESSAGE_KEYWORD: Fires when a message contains a keyword. Config: { "keywords": ["word1", "word2"] }
- TASK_CREATED: Fires when a new task is created. Config: {}
- TASK_STATUS_CHANGED: Fires when a task status changes. Config: { "status": "TODO"|"IN_PROGRESS"|"DONE"|"CANCELLED" } (or {} for any)
- TASK_ASSIGNED: Fires when a task is assigned. Config: {}

Available action types:
- AI_AGENT: Generate a message with AI and post it. Config: { "instruction": "<what AI should write>", "targetType": "CHANNEL"|"DM_TRIGGER_USER", "targetId": "" }
- NOTIFY: Send a DM notification. Config: { "message": "<message text>" }
- CREATE_TASK: Create a follow-up task. Config: { "title": "<task title>", "status": "TODO", "priority": "MEDIUM" }
- POST_CHANNEL: Post a plain message to a channel. Config: { "message": "<message text>" }

Rules:
- Always start with exactly one trigger node.
- Add one or more action nodes after the trigger.
- Position nodes vertically: trigger at y=80, each action 220px below the previous one, all at x=250.
- Use simple IDs: "trigger-1", "action-1", "action-2", etc.
- For SCHEDULE triggers with "every morning" or "daily": use frequency=daily, time=09:00.
- For SCHEDULE triggers with "every Monday" or "weekly": use frequency=weekly, time=09:00.
- Suggest a short, descriptive rule name (5 words max).
"""


class StepNodeModel(BaseModel):
    id: str
    type: Literal["trigger", "action"]
    node_type: TriggerType | ActionType = Field(alias="nodeType")
    config: dict = Field(default_factory=dict)
    position: dict = Field(default_factory=lambda: {"x": 250, "y": 80})

    class Config:
        populate_by_name = True


class StepEdgeModel(BaseModel):
    id: str
    source: str
    target: str


class WorkflowGraph(BaseModel):
    name: str = Field(description="Short descriptive name for this rule (5 words max)")
    nodes: list[StepNodeModel] = Field(description="List of trigger and action nodes")
    edges: list[StepEdgeModel] = Field(description="Connections between nodes")


class WorkflowSuggestAgent:
    name = "WorkflowSuggestAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0,
            ).with_structured_output(WorkflowGraph)
            if settings.OPENAI_API_KEY
            else None
        )

    def suggest(self, *, description: str) -> WorkflowGraph | None:
        if not self._llm:
            logger.warning("workflow_suggest_agent: OPENAI_API_KEY not set, using fallback")
            return self._fallback(description)

        try:
            result = self._llm.invoke([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Workflow description: {description}"},
            ])
            return result if isinstance(result, WorkflowGraph) else None
        except Exception as exc:
            logger.exception("workflow_suggest_agent: error: %s", exc)
            return self._fallback(description)

    def _fallback(self, description: str) -> WorkflowGraph:
        name = description[:40].strip() + ("…" if len(description) > 40 else "")
        return WorkflowGraph(
            name=name,
            nodes=[
                StepNodeModel(
                    id="trigger-1",
                    type="trigger",
                    nodeType="SCHEDULE",
                    config={"frequency": "daily", "time": "09:00", "cron": "0 9 * * *"},
                    position={"x": 250, "y": 80},
                ),
                StepNodeModel(
                    id="action-1",
                    type="action",
                    nodeType="AI_AGENT",
                    config={"instruction": description, "targetType": "CHANNEL", "targetId": ""},
                    position={"x": 250, "y": 300},
                ),
            ],
            edges=[StepEdgeModel(id="trigger-1->action-1", source="trigger-1", target="action-1")],
        )


workflow_suggest_agent = WorkflowSuggestAgent()
