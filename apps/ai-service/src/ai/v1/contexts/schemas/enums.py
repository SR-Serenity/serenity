from enum import Enum


class Domain(str, Enum):
    WORKSPACE_QA = "workspace_qa"
    SCHEDULE_AGENT = "schedule_agent"
    CHAT_ASSIST = "chat_assist"
