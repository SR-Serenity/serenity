"""Workspace QA agent — tool-equipped ReAct agent covering all workspace data sources."""

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from src.ai.v1.agents.workspace_qa.tools.calendar_tools import (
    create_calendar_item_tool,
    delete_calendar_item_tool,
    list_calendar_events_tool,
    search_calendar_events_tool,
    update_calendar_item_tool,
)
from src.ai.v1.agents.workspace_qa.tools.chat_tools import (
    get_messages_from_person_tool,
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
    send_email_tool,
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
    get_messages_from_person_tool,
    # Contacts
    list_contacts_tool,
    search_contacts_tool,
    # Calendar
    list_calendar_events_tool,
    search_calendar_events_tool,
    create_calendar_item_tool,
    update_calendar_item_tool,
    delete_calendar_item_tool,
    # Mail
    list_mail_accounts_tool,
    list_mail_threads_tool,
    search_mail_threads_tool,
    get_mail_thread_tool,
    send_email_tool,
]


def create_workspace_qa_agent():
    return create_react_agent(
        ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
        ),
        tools=_WORKSPACE_QA_TOOLS,
    )
