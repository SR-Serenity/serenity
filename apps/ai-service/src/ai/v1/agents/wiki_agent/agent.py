from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.wiki_agent.tools import (
    edit_wiki_page_tool,
    get_wiki_page_tool,
    list_wiki_pages_tool,
    search_wiki_pages_tool,
)
from src.core.config import settings

_TOOLS = [list_wiki_pages_tool, get_wiki_page_tool, search_wiki_pages_tool, edit_wiki_page_tool]


def create_wiki_agent():
    model = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    return create_agent(model, tools=_TOOLS)
