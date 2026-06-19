# Serenity — Feature Catalog

This document describes every major feature in the Serenity platform — what it does, who it is for, and how the system implements it.

---

## 1. Authentication & Onboarding

### 1.1 Registration

New users register by providing their name, email, password, and an organization name. The system:
1. Creates a `User` record with a bcrypt-hashed password.
2. Creates an `Organization` record with a URL-safe slug derived from the org name.
3. Assigns the user as `OWNER` of the new org via `WorkspaceMember`.
4. Returns a signed JWT that the frontend stores for subsequent requests.

Registration is a 4-step onboarding flow on the frontend: account details → org setup → profile picture → done.

### 1.2 Login

Users authenticate with email and password. On success, the Auth Service returns a JWT containing `userId` and `orgId`. The token is used as a Bearer token on every API call.

### 1.3 Invitation-Based Registration

Existing members can invite others by email. The system:
1. Generates a signed invitation token and stores it with an expiry.
2. Sends an email (via Resend) with a link containing the token.
3. The invitee clicks the link, fills in their details, and submits `POST /api/auth/register-with-invite`.
4. The user is created and immediately joined to the organization.

### 1.4 Organization Switching

A user can belong to multiple organizations. The frontend presents an org picker at login. Switching org issues a new JWT scoped to the selected org.

---

## 2. Chat

The chat system is the primary communication channel in a workspace. It supports channels (group conversations) and direct messages (DMs).

### 2.1 Channels

- **Public channels** — visible and joinable by any workspace member.
- **Private channels** — invite-only; the member list is restricted.
- Each channel has a name and a unique slug within the org.

### 2.2 Direct Messages (DMs)

Point-to-point conversations between two or more members. DMs are stored as conversations with type `DM`.

### 2.3 Messaging

- Members can send text messages in any conversation they belong to.
- Messages support rich content (links auto-preview, mentions).
- **Threads** — any message can be replied to, creating a thread. Replies are stored with a `parentId` pointing to the root message.
- **Reactions** — members can add emoji reactions to any message. Each reaction is stored as a `ChatReaction` (messageId + userId + emoji).

### 2.4 File Attachments

Members can attach files or GIFs to messages. Files are uploaded to Google Cloud Storage; the attachment record stores the GCS URL and MIME type. Upload status is tracked (`PENDING → COMPLETED | FAILED`).

### 2.5 Message Visibility (Soft Delete)

Users can "delete" a message from their own view without removing it for others. A `ChatMessageVisibility` record is created for that user, and the message is filtered out on query.

### 2.6 Real-time Delivery

All chat events (`message.created`, `message.updated`, `reaction.added`) are published to Redis and streamed to connected clients via SSE within milliseconds.

---

## 3. Calendar

A shared calendar for tracking events, meetings, and tasks within a workspace.

### 3.1 Item Types

The calendar uses a single `CalendarItem` model with a `type` discriminator:
- **EVENT** — a scheduled occurrence (birthday, deadline, milestone).
- **MEETING** — a meeting with attendees and an optional LiveKit video room.
- **TASK** — a to-do item with a due date, surfaced on the calendar view.

### 3.2 Attendees

Any calendar item can have attendees. Each `CalendarAttendee` record tracks the user and their attendance status.

### 3.3 Google Calendar Sync

Users can connect their Google account. When a calendar item is created or updated, the system:
1. Writes/updates the event in Google Calendar via the Google Calendar API.
2. Stores `googleEventId` on the `CalendarItem` for future updates.

Incoming events from Google Calendar can be pulled and synced into the workspace calendar.

### 3.4 Views

The frontend renders month, week, and day views. Calendar items are color-coded by type.

---

## 4. Tasks

A lightweight task management system integrated across the workspace.

### 4.1 Creating Tasks

Tasks can be created from multiple sources, tracked via `sourceType`:

| Source | Description |
|---|---|
| `MANUAL` | User creates a task directly in the Tasks view |
| `CHAT` | Task extracted from a chat message |
| `WIKI` | Task created while reading a wiki page |
| `EMAIL` | Task created from an email thread |
| `CALENDAR` | Task linked to a calendar event |
| `DOCUMENT` | Task extracted from an uploaded document |
| `AI` | Task suggested and created by the AI copilot |

### 4.2 Task Fields

- **Title** and **description**
- **Status**: `TODO → IN_PROGRESS → DONE | CANCELLED`
- **Priority**: `LOW | MEDIUM | HIGH`
- **Assignee**: a workspace member
- **Due date**
- **AI metadata**: `aiGenerated` flag, `aiReasoning` — the AI's explanation for why it suggested the task

### 4.3 Views

Tasks are displayed in a list view and a kanban board. Members can drag tasks between status columns (via dnd-kit).

---

## 5. Wiki / Knowledge Base

A hierarchical documentation system for capturing and sharing knowledge within the workspace.

### 5.1 Page Structure

Pages are organized in a tree (parent/child). The root level shows all top-level pages. Any page can have sub-pages.

### 5.2 Rich Content

Pages are edited using the BlockNote rich-text editor. Content is stored as both JSON (structured blocks) and Markdown (for export and AI processing). Supported block types: headings, paragraphs, bulleted/numbered lists, task lists, code blocks, images, tables, dividers.

### 5.3 Visibility & Sharing

Each page has a base visibility:
- `WORKSPACE` — visible to all members.
- `DEPARTMENT` — visible to members of the owner's department.
- `PRIVATE` — visible only to the owner.

Pages can be explicitly shared with specific users via `WikiPageShare`, granting `VIEW`, `COMMENT`, or `EDIT` permission.

### 5.4 Favorites & Recents

Members can star any page they have access to. The `WikiPageFavorite` table tracks stars. `WikiPageRecent` tracks the last-viewed timestamp per user, powering the "Recently viewed" sidebar.

### 5.5 AI-Assisted Editing

The AI copilot can edit wiki pages on request. The user describes what to change; the AI returns a proposed edit that the user can accept or reject.

---

## 6. Mail (Gmail Integration)

Serenity embeds an email client that syncs with Gmail, so members can read and act on emails without leaving the workspace.

### 6.1 Connecting a Gmail Account

1. Member clicks "Connect Gmail" — redirected to Google OAuth consent screen.
2. After consent, Core Service stores the OAuth refresh token in `MailAccount`.
3. The service begins syncing threads and messages via the Gmail API.

### 6.2 Thread & Message Sync

- **Threads** are synced with their labels (inbox, sent, starred, archived, spam).
- **Messages** within each thread store direction (`INBOUND` / `OUTBOUND`), body, and timestamp.
- **Attachments** are synced as metadata (not downloaded) until the user opens them.

### 6.3 Reading & Replying

Members can read email threads and reply inline. Replies are sent via the Gmail API using the stored OAuth token.

### 6.4 Task Creation from Email

A member can create a task from any email thread. The task is created with `sourceType: EMAIL` and linked to the thread for traceability.

---

## 7. Office (Virtual Office)

A virtual office feature that models physical office rooms — giving remote teams a sense of shared presence.

### 7.1 Room Types

| Type | Description |
|---|---|
| `OPEN` | Anyone can enter; visible to all |
| `PRIVATE` | Invite-only; hidden from the room list for non-members |
| `FOCUS` | Single-person quiet mode; knocking required |
| `SOCIAL` | Casual hangout space |

Each room has a max capacity. Members see who is currently in each room.

### 7.2 Joining a Room

When a member joins a room:
1. Core Service adds a `OfficeRoomParticipant` record.
2. A LiveKit access token is generated and returned to the client.
3. The frontend connects to the LiveKit room for audio/video.
4. Other members in the same org see the participant count update in real time.

### 7.3 Meeting Notes

During a room session, participants can take shared meeting notes (stored as `MeetingNote`). Notes are visible to anyone who was in the room.

---

## 8. Contacts

A workspace address book for managing people and agents.

### 8.1 Contact Types

| Type | Description |
|---|---|
| `EMPLOYEE` | A full workspace member |
| `GUEST` | External person without a full account |
| `AI_AGENT` | An AI agent persona that can participate in chats |

### 8.2 Status

Contacts can be `ACTIVE`, `INVITED` (invitation pending), or `ARCHIVED`.

### 8.3 Use Cases

- Finding members to DM or invite to a channel.
- Viewing department membership.
- Managing guest access.

---

## 9. Notifications & Inbox

### 9.1 Real-time Notifications

The system emits notification events over the SSE stream. The frontend displays toast notifications for:
- New messages in channels the user is a member of.
- Mentions.
- Task assignments.
- Automation-triggered notifications.

### 9.2 Inbox

The `/inbox` page collects all notifications for the current user. Notifications can be marked as read.

---

## 10. AI Copilot

An AI assistant embedded in the workspace, backed by the AI Service (FastAPI + LangGraph).

### 10.1 Copilot Chat

The `/copilot` page provides a chat interface with the AI. The user can ask questions about:
- Workspace data (recent messages, tasks, wiki pages).
- Uploaded documents.
- General knowledge.

Conversations are persisted as `AiSession` + `AiMessage` records so the user can continue previous conversations.

### 10.2 Proposed Actions

The AI never directly mutates application state. Instead, it returns **proposed actions** — structured JSON describing what it wants to do (e.g., "create task: X", "edit wiki page: Y"). The user sees the proposal and can approve or reject it. Core Service applies approved actions.

### 10.3 Document Q&A (RAG)

Members can upload documents (PDF, text). The AI Service:
1. Chunks the document into segments.
2. Embeds each chunk using an embedding model (OpenAI `text-embedding-3-small`, 1536-dim).
3. Stores embeddings in PostgreSQL with pgvector.

On query, the AI retrieves the most relevant chunks (cosine similarity) and uses them as context to answer questions.

### 10.4 Task Extraction

The AI can scan a block of text (a chat message, email, or document) and extract a list of implied tasks. Each extracted task includes a title, description, priority suggestion, and the AI's reasoning. Extracted tasks are created with `sourceType: AI`.

### 10.5 AI-Assisted Chat Reply

In the chat interface, members can ask the AI for a suggested reply to a message thread. The AI reads the thread context and proposes a reply that the member can edit and send.

### 10.6 Wiki AI Editing

From within any wiki page, a member can invoke the AI to rewrite, expand, or summarize a section. The AI returns a proposed diff; the member accepts or rejects it.

### 10.7 Streaming

All AI responses support token-streaming — the frontend renders text as it arrives, providing a ChatGPT-like typing effect.

### 10.8 Observability

All AI agent runs are traced in **Langfuse** — a self-hosted or cloud observability tool that captures prompts, completions, latency, token counts, and evaluation scores.

---

## 11. Automation

A no-code workflow engine that lets members automate repetitive tasks.

### 11.1 Rule Structure

An automation rule has:
- **Trigger** — what starts the automation.
- **Action** — what the automation does.
- **Enabled** flag — rules can be toggled without deletion.

### 11.2 Trigger Types

| Trigger | Description |
|---|---|
| `SCHEDULE` | Runs at a cron-defined time (e.g., every Monday at 9am) |
| `MEMBER_JOINED` | Fires when a new member joins the workspace |
| `MESSAGE_KEYWORD` | Fires when a message in a channel contains a keyword |
| `TASK_CREATED` | Fires when any task is created |
| `TASK_STATUS_CHANGED` | Fires when a task's status changes |
| `TASK_ASSIGNED` | Fires when a task is assigned to a member |

### 11.3 Action Types

| Action | Description |
|---|---|
| `AI_AGENT` | Calls the AI copilot with a prompt; result is the AI's response |
| `NOTIFY` | Sends a notification to specified members or channels |
| `CREATE_TASK` | Creates a new task with configured fields |
| `POST_CHANNEL` | Posts a message to a specified channel |

### 11.4 Automation Builder UI

The frontend provides two creation interfaces:
- **Form-based** (`/automation/new`) — step-by-step form for simple rules.
- **Canvas-based** (`/automation/canvas`) — a visual flow editor built on ReactFlow for complex multi-step automations.

---

## 12. Search

Global search across the workspace:
- Messages (chat).
- Wiki pages.
- Tasks.
- Contacts.
- Calendar items.

Results are returned ranked by relevance. The AI copilot can also answer questions over workspace content using the RAG pipeline (semantic search via embeddings).

---

## 13. Settings & Administration

### 13.1 Workspace Settings

Org owners and admins can:
- Rename the organization and change its slug.
- Manage members — view all members, change roles, remove members.
- Manage departments — create, rename, dissolve.
- Configure integrations (Gmail OAuth, Google Calendar).

### 13.2 User Profile

Each member has a profile with display name and avatar. Profile data is editable from `/profile`.

### 13.3 Role-Based Access

| Role | Permissions |
|---|---|
| `OWNER` | Full control: billing, deletion, role assignment |
| `ADMIN` | Manage members, settings, integrations |
| `MEMBER` | Standard workspace access |

---

## 14. Internationalization (i18n)

The frontend ships in two languages:
- **English** (`en`)
- **Vietnamese** (`vi`)

Language selection is handled by `next-intl`. Translation files live under `apps/web/messages/`.

---

## 15. Feature Integration Map

The following table shows how features interconnect:

| Feature | Creates tasks | Triggers automation | Generates AI content | Real-time events |
|---|---|---|---|---|
| Chat | ✓ (from messages) | ✓ (keyword trigger) | ✓ (reply assist) | ✓ |
| Wiki | ✓ (from pages) | — | ✓ (edit assist) | — |
| Mail | ✓ (from emails) | — | — | — |
| Calendar | ✓ (task type) | — | — | ✓ |
| Tasks | — | ✓ (task triggers) | ✓ (extraction) | ✓ |
| Automation | ✓ (CREATE_TASK) | — | ✓ (AI_AGENT action) | — |
| Office | — | — | — | ✓ |
| Copilot | ✓ (proposed actions) | — | ✓ (core feature) | ✓ (streaming) |
