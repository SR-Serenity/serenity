from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.chat_agent.tools import (
    get_conversation_messages_tool,
    get_messages_from_person_tool,
    list_conversations_tool,
    search_all_messages_tool,
    search_messages_tool,
)
from src.core.config import settings

_TOOLS = [
    list_conversations_tool,
    get_conversation_messages_tool,
    search_messages_tool,
    search_all_messages_tool,
    get_messages_from_person_tool,
]


def create_chat_agent():
    model = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    return create_agent(model, tools=_TOOLS)
