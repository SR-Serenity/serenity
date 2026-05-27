from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)
INTERNAL_HEADERS = {"x-internal-api-token": "dev-internal-token"}


def _auth_context(org_id: str = "org-1", user_id: str = "user-1") -> dict[str, str]:
    return {"orgId": org_id, "userId": user_id, "role": "member"}


def test_health_returns_healthy() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_chat_endpoint_returns_fallback_response() -> None:
    response = client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-1",
            "messages": [{"role": "user", "content": "hello"}],
            "authContext": _auth_context(),
            "context": {"entrypoint": "chat"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["threadId"] == "org-1:user-1:session-1"
    assert "Serenity AI is connected" in data["answer"]
    assert data["proposedActions"] == []


def test_task_proposal_does_not_execute_mutation() -> None:
    response = client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-1",
            "messages": [{"role": "user", "content": "Create a task to review Q4 docs"}],
            "authContext": _auth_context(),
            "context": {"entrypoint": "chat"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["proposedActions"][0]["type"] == "CREATE_TASK"
    assert data["proposedActions"][0]["requiresConfirmation"] is True
    assert "Nothing has been changed" in data["answer"]


def test_meeting_proposal_does_not_execute_mutation() -> None:
    response = client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-2",
            "messages": [{"role": "user", "content": "Schedule a meeting with a room for 8 people"}],
            "authContext": _auth_context(),
            "context": {"entrypoint": "calendar"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["proposedActions"][0]["type"] == "BOOK_ROOM"
    assert data["proposedActions"][0]["requiresConfirmation"] is True


def test_document_agent_returns_file_and_page_citations() -> None:
    index_response = client.post(
        "/api/internal/v1/ai/files/index",
        headers=INTERNAL_HEADERS,
        json={
            "authContext": _auth_context(),
            "file": {"fileId": "file-1", "title": "Handbook.pdf"},
            "pages": [
                "The onboarding process starts with account setup.",
                "Expense reports are approved by finance every Friday.",
            ],
        },
    )
    assert index_response.status_code == 200
    assert index_response.json()["chunksIndexed"] == 2

    ask_response = client.post(
        "/api/internal/v1/ai/files/ask",
        headers=INTERNAL_HEADERS,
        json={
            "authContext": _auth_context(),
            "fileIds": ["file-1"],
            "question": "Who approves expense reports?",
        },
    )

    assert ask_response.status_code == 200
    data = ask_response.json()
    assert data["sources"][0]["fileId"] == "file-1"
    assert data["sources"][0]["page"] == 2


def test_long_term_memory_scoped_by_org() -> None:
    client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-remember",
            "messages": [{"role": "user", "content": "Remember I prefer short updates"}],
            "authContext": _auth_context("org-a", "user-1"),
            "context": {"entrypoint": "chat"},
        },
    )

    same_org = client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-next",
            "messages": [{"role": "user", "content": "What should you know?"}],
            "authContext": _auth_context("org-a", "user-1"),
            "context": {"entrypoint": "chat"},
        },
    )
    other_org = client.post(
        "/api/internal/v1/ai/chat",
        headers=INTERNAL_HEADERS,
        json={
            "sessionId": "session-next",
            "messages": [{"role": "user", "content": "What should you know?"}],
            "authContext": _auth_context("org-b", "user-1"),
            "context": {"entrypoint": "chat"},
        },
    )

    assert "long-term workspace context" in same_org.json()["answer"]
    assert "long-term workspace context" not in other_org.json()["answer"]
