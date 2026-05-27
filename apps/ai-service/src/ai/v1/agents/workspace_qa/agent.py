"""Workspace QA agent — tool-equipped react agent covering all workspace data sources."""

from langchain.agents import AgentState, create_agent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver

from src.ai.v1.agents.workspace_qa.prompts import build_workspace_qa_prompt
from src.ai.v1.agents.workspace_qa.tools.calendar_tools import (
    list_calendar_events_tool,
    search_calendar_events_tool,
)
from src.ai.v1.agents.workspace_qa.tools.chat_tools import (
    list_conversations_tool,
    search_all_messages_tool,
    search_messages_tool,
)
from src.ai.v1.agents.workspace_qa.tools.contact_tools import (
    list_contacts_tool,
    search_contacts_tool,
)
from src.ai.v1.agents.workspace_qa.tools.mail_tools import (
    get_mail_thread_tool,
    list_mail_accounts_tool,
    list_mail_threads_tool,
    search_mail_threads_tool,
)
from src.ai.v1.agents.workspace_qa.tools.wiki_tools import (
    get_wiki_page_tool,
    list_wiki_pages_tool,
    search_wiki_pages_tool,
)
from src.core.config import settings

_WORKSPACE_QA_TOOLS = [
    # Wiki
    list_wiki_pages_tool,
    search_wiki_pages_tool,
    get_wiki_page_tool,
    # Chat
    list_conversations_tool,
    search_all_messages_tool,
    search_messages_tool,
    # Contacts
    list_contacts_tool,
    search_contacts_tool,
    # Calendar
    list_calendar_events_tool,
    search_calendar_events_tool,
    # Mail
    list_mail_accounts_tool,
    list_mail_threads_tool,
    search_mail_threads_tool,
    get_mail_thread_tool,
]

_agent = None


def create_workspace_qa_agent():
    global _agent
    if _agent is not None:
        return _agent

    model = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )
    checkpointer = InMemorySaver()
    _agent = create_agent(
        model,
        tools=_WORKSPACE_QA_TOOLS,
        middleware=[build_workspace_qa_prompt],
        state_schema=AgentState,
        checkpointer=checkpointer,
    )
    return _agent
