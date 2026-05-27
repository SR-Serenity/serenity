"""Memory namespace helpers."""


def make_thread_id(org_id: str, user_id: str, session_id: str) -> str:
    return f"{org_id}:{user_id}:{session_id}"


def user_preferences_namespace(org_id: str, user_id: str) -> tuple[str, str, str, str, str]:
    return ("org", org_id, "user", user_id, "preferences")


def workspace_facts_namespace(org_id: str) -> tuple[str, str, str, str]:
    return ("org", org_id, "workspace", "facts")
