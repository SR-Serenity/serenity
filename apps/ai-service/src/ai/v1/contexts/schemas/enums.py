from enum import Enum


class Domain(str, Enum):
    WORKSPACE_QA = "workspace_qa"
    DOCUMENT_UNDERSTANDING = "document_understanding"
    SCHEDULE_AGENT = "schedule_agent"
