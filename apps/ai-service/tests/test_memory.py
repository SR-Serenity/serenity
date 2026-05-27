from src.ai.v1.memory.namespaces import (
    make_thread_id,
    user_preferences_namespace,
    workspace_facts_namespace,
)


def test_thread_id_generation_is_stable() -> None:
    assert make_thread_id("org-1", "user-2", "session-3") == "org-1:user-2:session-3"


def test_memory_namespaces_scope_org_and_user() -> None:
    assert user_preferences_namespace("org-1", "user-2") == (
        "org",
        "org-1",
        "user",
        "user-2",
        "preferences",
    )
    assert workspace_facts_namespace("org-1") == ("org", "org-1", "workspace", "facts")
