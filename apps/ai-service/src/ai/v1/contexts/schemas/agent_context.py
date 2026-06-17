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
    # mutable slot: wiki tools write pending edits here; the node reads it back after ainvoke
    pending_edit: dict | None = None
