from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.mail_agent.tools import (
    get_mail_thread_tool,
    list_mail_accounts_tool,
    list_mail_threads_tool,
    search_mail_threads_tool,
    send_email_tool,
)
from src.core.config import settings

_TOOLS = [
    list_mail_accounts_tool,
    list_mail_threads_tool,
    search_mail_threads_tool,
    get_mail_thread_tool,
    send_email_tool,
]


def create_mail_agent():
    model = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    return create_agent(model, tools=_TOOLS)
