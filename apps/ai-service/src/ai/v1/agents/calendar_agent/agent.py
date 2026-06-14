from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.calendar_agent.tools import (
    create_calendar_item_tool,
    delete_calendar_item_tool,
    get_calendar_item_tool,
    list_calendar_events_tool,
    search_calendar_events_tool,
    update_calendar_item_tool,
)
from src.core.config import settings

_TOOLS = [
    list_calendar_events_tool,
    get_calendar_item_tool,
    search_calendar_events_tool,
    create_calendar_item_tool,
    update_calendar_item_tool,
    delete_calendar_item_tool,
]


def create_calendar_agent():
    model = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    return create_agent(model, tools=_TOOLS)
