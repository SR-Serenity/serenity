# Serenity — Demo Script

**Target audience:** Thesis defence committee / evaluators  
**Estimated duration:** 20–30 minutes  
**Setup:** Browser open at `http://localhost:9999`, all services running, sample data seeded

---

## Pre-Demo Checklist

- [ ] `make up-infra` — PostgreSQL, Redis, LiveKit running
- [ ] Auth Service, Core Service, Gateway, Realtime Service, AI Service all started
- [ ] Web frontend running at port 9999
- [ ] Sample org created: **"Acme Corp"** (`acme-corp` slug)
- [ ] At least 3 user accounts seeded (e.g., `demo@acme.com`, `alice@acme.com`, `bob@acme.com`)
- [ ] A few chat channels created: `#general`, `#engineering`, `#product`
- [ ] A few wiki pages created with content
- [ ] A couple of tasks created in various states
- [ ] One Gmail account connected (for mail demo)
- [ ] Two browser windows open — one logged in as `demo`, one as `alice` — for real-time demo
- [ ] Screen resolution: 1440px width minimum; browser zoom at 90%

---

## Narrative Arc

> *"Serenity is an all-in-one workspace platform for modern teams. Instead of jumping between Slack, Notion, Gmail, and a task tracker, everything lives in one place — and an AI copilot connects it all. I'll walk you through each layer of the product."*

---

## Scene 1 — Registration & Onboarding (2 min)

**Goal:** Show the onboarding flow and multi-tenant foundation.

1. Open a fresh incognito window → navigate to `/register`.
2. Walk through the 4-step registration:
   - **Step 1:** Enter name, email, password.
   - **Step 2:** Enter organization name (e.g., "Demo Corp") — show the slug being auto-generated.
   - **Step 3:** Upload a profile picture (or skip).
   - **Step 4:** Done screen — click "Enter workspace".
3. Land on the workspace dashboard `/[orgSlug]/dashboard`.

**Talking points:**
- Each registration creates an isolated organization. All data is scoped to that org — this is the multi-tenancy model.
- The JWT returned at login contains both `userId` and `orgId`, so every API call is inherently tenant-scoped.

---

## Scene 2 — Chat (4 min)

**Goal:** Demonstrate the core communication feature and real-time updates.

### 2a. Channels & Messaging

1. Click on `#general` in the left sidebar.
2. Send a message: *"Good morning everyone! Standup in 10 minutes."*
3. Switch to the second browser window (logged in as Alice) — show the message appearing instantly **without a page refresh**.

**Talking point:** *"Messages are delivered in real time via Server-Sent Events. Core Service publishes an event to Redis; the Realtime Service picks it up and pushes it to every connected client in the same organization."*

### 2b. Threads

1. Hover over any existing message → click the **Reply** icon.
2. Post a thread reply: *"I'll be 5 minutes late."*
3. Show the thread panel opening on the right.

### 2c. Reactions

1. Hover over a message → click the emoji icon → select 👍.
2. Switch to Alice's window — show the reaction appear on her screen.

### 2d. File Attachment

1. Click the attachment icon in the composer.
2. Upload a small image or PDF.
3. Show the file appearing inline in the message.

**Talking point:** *"Attachments are uploaded to Google Cloud Storage. The message record stores the GCS URL; the file is streamed directly from GCS to the client."*

---

## Scene 3 — AI Copilot (5 min)

**Goal:** This is the most differentiating feature — give it the most time.

### 3a. Copilot Chat

1. Navigate to `/[orgSlug]/copilot`.
2. Ask: *"Summarize what was discussed in #general today."*
3. Show the AI streaming its response token by token.

**Talking point:** *"The AI has access to workspace context — it can read messages, tasks, and wiki pages relevant to the query. Responses stream to the client via chunked HTTP."*

### 3b. Task Extraction

1. Open the `#engineering` channel.
2. Paste a message like: *"We need to fix the login bug, update the API docs, and schedule a code review for Friday."*
3. Click the **Extract Tasks** button (or navigate to the task extraction UI).
4. Show the AI returning 3 structured tasks with title, suggested priority, and reasoning.
5. Confirm — the tasks appear in the Tasks view.

**Talking point:** *"Instead of manually copying action items, the AI parses natural language into structured tasks. Each AI-generated task carries an `aiReasoning` field explaining why the AI created it."*

### 3c. Document Q&A

1. Navigate to the document upload section in Copilot.
2. Upload a short PDF (a project spec or any document).
3. Ask: *"What are the main deliverables in this document?"*
4. Show the answer with source citations.

**Talking point:** *"Uploaded documents are chunked and embedded using OpenAI's embedding model. Embeddings are stored in PostgreSQL with the pgvector extension. At query time, the system retrieves the most semantically similar chunks and feeds them as context to the LLM."*

### 3d. Proposed Actions

1. Ask the copilot: *"Create a task to review the API documentation by next Friday, assigned to Alice."*
2. Show the AI returning a **proposed action** card — not the task itself.
3. Click **Accept** — the task appears in the task list.

**Talking point:** *"The AI never directly mutates application state. It proposes actions, and the user approves or rejects them. This keeps the human in the loop and prevents unintended changes."*

---

## Scene 4 — Wiki / Knowledge Base (3 min)

**Goal:** Show documentation and collaboration features.

1. Navigate to `/[orgSlug]/wiki`.
2. Show the page tree — top-level pages with sub-pages.
3. Open an existing page — show the rich content (headings, lists, code blocks).
4. Click **Edit** — show the BlockNote rich-text editor.
5. Make a small edit, save.
6. Click **Share** — demonstrate granting Alice `EDIT` permission on this page.
7. Switch to Alice's window — she can now open and edit the page.

**Talking point:** *"Wiki pages support fine-grained sharing: VIEW, COMMENT, or EDIT. By default a page can be workspace-wide, department-scoped, or private. This mirrors how real teams manage internal documentation."*

### AI-Assisted Wiki Edit

1. While in the wiki editor, click the **AI** button.
2. Type: *"Add a section summarizing the authentication flow."*
3. Show the AI proposing a new section.
4. Accept — the section is inserted into the page.

---

## Scene 5 — Tasks (2 min)

**Goal:** Show task management and cross-feature integration.

1. Navigate to `/[orgSlug]/tasks`.
2. Show the **kanban board** — columns: To Do, In Progress, Done, Cancelled.
3. Drag a task from "To Do" to "In Progress" — show the status update.
4. Click **New Task** — create one manually.
5. Show the `sourceType` field — point out a task that came from chat (badge or label).

**Talking point:** *"Tasks in Serenity are source-aware. Whether a task was created manually, extracted from a chat message, generated by the AI, or imported from an email — the system tracks where it came from. This creates a full audit trail of how work originates."*

---

## Scene 6 — Calendar (2 min)

**Goal:** Show scheduling and Google Calendar sync.

1. Navigate to `/[orgSlug]/calendar`.
2. Show the month/week view with existing events.
3. Click **New Event** — fill in title, date, add Alice as an attendee.
4. Save — show the event appearing on the calendar.
5. If Google Calendar is connected, show the sync badge or explain the sync mechanism.

**Talking point:** *"Calendar items can be events, meetings, or tasks — all unified in one view. For teams already using Google Calendar, Serenity syncs bidirectionally so members don't need to maintain two calendars."*

---

## Scene 7 — Virtual Office (2 min)

**Goal:** Show presence and video conferencing.

1. Navigate to `/[orgSlug]/office`.
2. Show the room grid — OPEN, FOCUS, SOCIAL rooms with participant counts.
3. Click **Join** on an OPEN room.
4. Show the LiveKit video interface loading (camera/mic controls).
5. Switch to Alice's window — she joins the same room.
6. Show both participants visible in the video grid.

**Talking point:** *"The Office feature gives remote teams a sense of physical presence. LiveKit handles all media routing — Core Service only issues access tokens; it never touches media streams. Room state (who is in which room) is tracked in the database and updated in real time."*

---

## Scene 8 — Mail Integration (2 min)

**Goal:** Show the Gmail integration.

1. Navigate to `/[orgSlug]/mail`.
2. Show the connected Gmail inbox — threads listed with labels.
3. Open a thread — show the full message chain.
4. Click **Create Task from Email** — show the task modal pre-filled with the email subject.
5. Save — task appears in the task list with `sourceType: EMAIL`.

**Talking point:** *"Rather than replacing email, Serenity integrates with it. Members connect their Gmail account via OAuth; threads sync automatically. The key value is being able to act on emails — create tasks, share context — without leaving the workspace."*

---

## Scene 9 — Automation (3 min)

**Goal:** Show the no-code workflow engine.

1. Navigate to `/[orgSlug]/automation`.
2. Show the list of existing rules.
3. Click **New Automation** → use the form-based builder:
   - **Trigger:** `MESSAGE_KEYWORD` — keyword: "urgent"
   - **Action:** `NOTIFY` — send notification to `#general`
4. Save and enable the rule.
5. Go to `#engineering`, send: *"This is urgent — the prod server is down."*
6. Show the notification arriving in `#general`.

**Then show the canvas:**

7. Click **Canvas** — open the ReactFlow automation canvas.
8. Walk through a pre-built multi-step automation visually.

**Talking point:** *"Automation rules are stored as JSON trigger/action configurations. The engine evaluates triggers on every relevant event — no polling, purely event-driven. The canvas editor is built on ReactFlow and gives power users a visual way to reason about complex workflows."*

---

## Scene 10 — Architecture Recap (1 min)

**Goal:** Tie the demo back to the technical thesis.

Draw attention to what just happened under the hood:

> *"Everything you just saw flows through 6 services:"*

1. **Gateway** — every request entered here.
2. **Auth Service** — JWT issued at login, validated on every call.
3. **Core Service** — all business logic: messages, tasks, wiki, mail, calendar, office.
4. **Realtime Service** — every live update delivered via Redis → SSE.
5. **AI Service** — copilot, task extraction, document Q&A, wiki editing.
6. **Web Frontend** — Next.js app stitching it all together with Zustand state and SSE listeners.

> *"The entire system runs as a Nx monorepo — one repository, consistent tooling, shared type definitions, independent deployability."*

---

## Contingency Notes

| If this breaks | Fallback |
|---|---|
| AI Service is slow | Pre-record AI responses or use cached screenshots |
| LiveKit not connecting | Show the room join UI and explain; skip the video grid |
| Gmail OAuth expired | Show the mail UI with seed data; skip the live sync |
| Real-time not working | Reload the SSE connection; refresh both browser windows |
| Seed data missing | Create items live — takes 30 seconds per feature |

---

## Q&A Preparation

**Q: How does multi-tenancy work?**  
Every database record has an `orgId` foreign key. All queries include `WHERE org_id = $orgId` derived from the JWT. Tenants are logically isolated at the data layer.

**Q: Why Server-Sent Events instead of WebSockets?**  
SSE is simpler to implement and scale — it is unidirectional (server → client), stateless from the server's perspective, and works over standard HTTP/2. Since clients only receive events (they send data via regular HTTP POST), SSE is sufficient.

**Q: How does the AI avoid hallucinating workspace data?**  
The AI does not have training-time knowledge of workspace content. Context is always injected at inference time — either as retrieved document chunks (RAG) or as structured data passed in the prompt. The AI can only reference what is explicitly given to it.

**Q: How does the proposed actions system prevent bad AI actions?**  
The AI returns structured JSON (e.g., `{ "type": "CREATE_TASK", "payload": { ... } }`) — it never calls APIs directly. Core Service receives the proposal, presents it to the user, and only applies it after explicit confirmation. This is an architectural constraint, not just a prompt instruction.

**Q: How would the system scale?**  
- Gateway and Core Service are stateless — horizontal scaling behind a load balancer.
- Realtime Service is stateless because shared state lives in Redis — any instance can serve any client.
- AI Service is independently scalable (Python workers).
- PostgreSQL scales with read replicas; pgvector queries can be offloaded to replicas.

**Q: What is the role of Nx in the project?**  
Nx provides build orchestration, task caching, and dependency graphing across all apps and libraries. When one library changes, Nx knows which downstream apps are affected and only rebuilds/retests those. This significantly reduces CI time in a large monorepo.
