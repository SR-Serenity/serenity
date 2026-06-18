from dataclasses import dataclass, field


@dataclass
class AgentContext:
    org_id: str
    user_id: str
    auth_token: str
    user_context: dict = field(default_factory=dict)
    time_zone: str = ""
    wiki_page_id: str | None = None
    conversation_id: str | None = None
    task_id: str | None = None
    active_task: dict | None = None
    # mutable slots: tools write proposals/edits here; the node reads them back after ainvoke
    pending_edit: dict | None = None
    pending_proposal: dict | None = None
