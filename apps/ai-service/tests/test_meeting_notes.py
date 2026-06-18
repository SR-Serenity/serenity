from src.ai.v1.agents.meeting_notes.agent import MeetingNotesAgent


def _fallback_agent() -> MeetingNotesAgent:
    agent = MeetingNotesAgent()
    agent._llm = None
    return agent


def test_meeting_notes_fallback_emits_required_sections() -> None:
    agent = _fallback_agent()

    result = agent.summarize(
        transcript_markdown="\n".join(
            [
                "## Live transcript",
                "- 00:01 Huy: We decided to launch on Friday.",
                "- 00:02 Linh: I will follow up with QA.",
                "- 00:03 Huy: Is the rollout blocked by legal?",
            ]
        ),
    )
    markdown = agent.to_markdown(result)

    assert "## Meeting Summary" in markdown
    assert "## Decisions" in markdown
    assert "## Action Items" in markdown
    assert "## Open Questions" in markdown
    assert "## Key Transcript Highlights" in markdown
    assert "- We decided to launch on Friday." in markdown
    assert "- [ ] I will follow up with QA." in markdown
    assert "- Is the rollout blocked by legal?" in markdown


def test_meeting_notes_fallback_handles_empty_transcript() -> None:
    agent = _fallback_agent()

    markdown = agent.to_markdown(agent.summarize(transcript_markdown=""))

    assert "## Meeting Summary" in markdown
    assert "- No transcript provided." in markdown
    assert "## Decisions" in markdown
    assert "- No decisions captured." in markdown
    assert "## Action Items" in markdown
    assert "- No action items captured." in markdown
