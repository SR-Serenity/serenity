from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.contacts_agent.tools import (
    list_contacts_tool,
    search_contacts_tool,
)
from src.core.config import settings

_TOOLS = [list_contacts_tool, search_contacts_tool]


def create_contacts_agent():
    model = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    return create_agent(model, tools=_TOOLS)
