from enum import Enum


class Domain(str, Enum):
    WORKSPACE_QA = "workspace_qa"
    DOCUMENT_UNDERSTANDING = "document_understanding"
    TASK_CREATOR = "task_creator"
    MEETING_SCHEDULER = "meeting_scheduler"
