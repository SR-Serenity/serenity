# Serenity — System Architecture

## 1. Overview

Serenity is a multi-tenant workspace collaboration platform similar in concept to Slack, built as a monorepo using **Nx 22** with **pnpm workspaces**. It follows a microservices architecture where each service is independently deployable and owns a distinct domain of the application.

The system is composed of five backend services, one frontend application, and one AI orchestration service, all communicating over HTTP and a shared Redis pub/sub bus.

---

## 2. High-Level Architecture

```
                            ┌─────────────────────────────┐
                            │         Web Client           │
                            │    Next.js 16 / React 19     │
                            │         Port 2997            │
                            └──────────────┬──────────────┘
                                           │ HTTP / SSE
                            ┌──────────────▼──────────────┐
                            │         API Gateway          │
                            │        NestJS 11             │
                            │         Port 2991            │
                            └──┬──────────┬────────────┬──┘
                               │          │            │
               ┌───────────────▼─┐  ┌─────▼───────┐  ┌▼──────────────────┐
               │  Auth Service   │  │ Core Service │  │  Realtime Service  │
               │   NestJS 11     │  │  NestJS 11   │  │    NestJS 11       │
               │   Port 2992     │  │  Port 2993   │  │    Port 2996       │
               └───────┬─────────┘  └──────┬───────┘  └────────┬──────────┘
                       │                   │                    │
               ┌───────▼───────────────────▼────────┐  ┌───────▼──────┐
               │          PostgreSQL 16              │  │   Redis 7    │
               │          (+ pgvector)               │  │   Pub/Sub    │
               └────────────────────────────────────┘  └──────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │        AI Service          │
                     │   FastAPI + LangGraph      │
                     │       Port 8001            │
                     └───────────────────────────┘
```

**Data flows:**
- The browser talks exclusively to the **Gateway**, which proxies requests to the correct downstream service.
- **Auth Service** handles identity; **Core Service** handles all business logic.
- **Core Service** publishes events to **Redis**; **Realtime Service** subscribes and streams them to clients over SSE.
- **AI Service** is an internal service — Core Service calls it; it is never exposed directly to the browser.

---

## 3. Services

### 3.1 API Gateway (Port 2991)

The Gateway is the single entry point for all HTTP traffic from the frontend. It is responsible for:

- **Request proxying** — forwards `/api/auth/*` to Auth Service, `/api/*` to Core Service, `/api/realtime/*` to Realtime Service.
- **Token forwarding** — extracts the `Authorization: Bearer <jwt>` header and passes it downstream so each service can identify the caller.
- **CORS** — manages cross-origin policy.
- **Swagger** — aggregates API documentation.

The Gateway itself holds no business logic and no database connection.

### 3.2 Auth Service (Port 2992)

Owns user identity and organization membership. Backed by Prisma + PostgreSQL.

**Responsibilities:**
- User registration (`POST /api/auth/register`) — creates a user and an initial organization, hashes the password with bcryptjs.
- User login (`POST /api/auth/login`) — validates credentials, issues a signed JWT (HS256).
- Invitation flow — creates invitation tokens, emails them via Resend, and handles acceptance (`POST /api/auth/register-with-invite`, `POST /api/invitations/accept`).
- Organization CRUD — listing and managing organizations a user belongs to.
- Department management — hierarchical departments within an organization.

**JWT payload:** `{ userId, orgId, iat, exp }`. Secret and TTL are environment-configured (`JWT_SECRET`, `JWT_EXPIRES_IN`).

### 3.3 Core Service (Port 2993)

The largest service — contains all product domain logic. Every feature module lives here.

| Module | Domain |
|---|---|
| `ChatModule` | Channels, DMs, messages, threads, reactions, attachments |
| `CalendarModule` | Events, meetings, tasks, Google Calendar sync |
| `ContactsModule` | Employees, guests, AI agents |
| `WikiModule` | Knowledge base pages, sharing, favorites |
| `MailModule` | Gmail OAuth integration, thread and message sync |
| `OfficeModule` | Virtual office rooms, participants, meeting notes |
| `TasksModule` | Task creation, assignment, status tracking |
| `AiModule` | AI session management, proxying to AI Service |
| `AutomationModule` | Trigger-based workflow rules |
| `OrganizationsModule` | Org-level operations |
| `UsersModule` | User profiles and preferences |
| `RealtimeModule` | Publishes events to Redis |
| `UploadModule` | File uploads to Google Cloud Storage |

All entities include an `orgId` field enforcing multi-tenant data isolation.

### 3.4 Realtime Service (Port 2996)

Bridges Core Service events to connected browser clients using **Server-Sent Events (SSE)**.

- Exposes `GET /api/realtime/events` — clients open a persistent SSE connection, authenticated via JWT (query param or header).
- Subscribes to Redis Pub/Sub channels; every event published by Core Service is forwarded to all clients of the same organization.
- Stateless — any number of instances can run behind a load balancer sharing the same Redis.

### 3.5 AI Service (Port 8001)

A Python FastAPI service that provides AI capabilities to the rest of the platform. It is internal-only — the Core Service calls it; the browser never reaches it directly.

**Key capabilities:**

| Endpoint | Purpose |
|---|---|
| `POST /api/internal/v1/ai/chat` | Multi-turn chat with workspace context |
| `POST /api/internal/v1/ai/chat/stream` | Streamed token-by-token response |
| `POST /api/internal/v1/ai/chat/assist` | AI-suggested reply for a human agent |
| `POST /api/internal/v1/ai/tasks/extract` | Extract tasks from a block of text |
| `POST /api/internal/v1/ai/files/index` | Chunk and embed a document into pgvector |
| `POST /api/internal/v1/ai/files/ask` | RAG query over indexed documents |
| `POST /api/internal/v1/ai/wiki/edit` | AI-assisted wiki page editing |

**Architecture inside AI Service:**
- Built with **LangGraph** for stateful, multi-step agent graphs.
- Uses **LangChain** adapters for both OpenAI and Google Gemini.
- Conversation state is persisted to PostgreSQL via a LangGraph checkpointer.
- Vector embeddings (1536-dim) are stored in PostgreSQL using the **pgvector** extension.
- Traces and evaluations are sent to **Langfuse** for observability.
- Agents propose actions (structured JSON) rather than directly mutating application state — Core Service decides whether to apply them.

### 3.6 Web Frontend (Port 2997 / 9999 dev)

A **Next.js 16** application using the App Router with React 19.

**Route groups:**
- `(auth)` — public routes: `/login`, `/register`
- `(landing)` — marketing/landing page
- `(workspace)/[orgSlug]/` — all protected workspace routes

**State management:** Zustand stores per domain (chat, calendar, wiki, etc.).

**Real-time updates:** The frontend opens a persistent SSE connection to the Realtime Service on mount and dispatches incoming events to the appropriate Zustand store.

**Key third-party integrations on the frontend:**
- **BlockNote + TipTap** — rich-text editor for wiki pages and chat composer.
- **ReactFlow** — flow canvas for automation rule editor.
- **dnd-kit** — drag-and-drop for tasks and kanban boards.
- **LiveKit React SDK** — video and audio conferencing inside Office rooms.
- **next-intl** — `en` / `vi` internationalization.

---

## 4. Database Schema

### Engine & Extensions

- **PostgreSQL 16**
- **pgvector** extension for storing and querying vector embeddings (used by AI RAG pipeline).
- **Prisma 6** as the ORM across both Auth and Core services.

### Entity Groups

#### Identity & Multi-tenancy

```
User            id, email (unique), displayName, passwordHash, createdAt
Organization    id, name, slug (unique), createdAt
WorkspaceMember userId, orgId, role (OWNER | ADMIN | MEMBER)
Department      id, name, orgId
Invitation      id, email, orgId, token, status (PENDING | ACCEPTED | EXPIRED | REVOKED), expiresAt
```

Every resource entity carries an `orgId` foreign key — queries always filter by org for tenant isolation.

#### Chat

```
ChatConversation        id, orgId, type (PUBLIC_CHANNEL | PRIVATE_CHANNEL | DM), name, slug
ChatConversationMember  conversationId, userId
ChatMessage             id, conversationId, orgId, senderId, content, parentId (thread), createdAt
ChatReaction            messageId, userId, emoji
ChatAttachment          id, messageId, url (GCS), mimeType, uploadStatus
ChatMessageVisibility   messageId, userId  -- records per-user soft deletes
```

#### Calendar

```
CalendarItem        id, orgId, type (EVENT | MEETING | TASK), title, startAt, endAt, createdById
CalendarAttendee    calendarItemId, userId, status
```

Google Calendar fields (`googleEventId`, `googleAccountId`) allow bidirectional sync.

#### Wiki / Knowledge Base

```
WikiPage            id, orgId, parentId (tree), title, content (JSON), visibility (WORKSPACE | DEPARTMENT | PRIVATE)
WikiPageShare       pageId, userId, permission (VIEW | COMMENT | EDIT)
WikiPageFavorite    pageId, userId
WikiPageRecent      pageId, userId, viewedAt
```

#### Email

```
MailAccount     id, orgId, userId, provider, accountId, refreshToken, status
MailThread      id, accountId, gmailThreadId, subject, labels, unread, starred
MailMessage     id, threadId, gmailMessageId, direction (INBOUND | OUTBOUND), body, sentAt
MailAttachment  id, messageId, filename, mimeType, size
```

#### Office / Video

```
OfficeRoom              id, orgId, name, type (OPEN | PRIVATE | FOCUS | SOCIAL), maxCapacity, deletedAt
OfficeRoomParticipant   roomId, userId, joinedAt
MeetingNote             id, roomId, content, createdAt
```

#### Tasks

```
Task    id, orgId, title, description, status (TODO | IN_PROGRESS | DONE | CANCELLED),
        priority (LOW | MEDIUM | HIGH), assigneeId, dueDate,
        sourceType (MANUAL | CHAT | WIKI | EMAIL | CALENDAR | DOCUMENT | AI),
        aiGenerated, aiReasoning
```

#### AI

```
AiSession   id, orgId, userId, title, createdAt
AiMessage   id, sessionId, role (user | assistant), content, sources (JSON), proposedActions (JSON)
```

#### Documents & Embeddings

```
DocumentFile    id, orgId, name, gcsUri, chunkCount
DocumentChunk   id, fileId, text, embedding (vector 1536)
```

#### Automation

```
AutomationRule  id, orgId, name, enabled,
                triggerType (SCHEDULE | MEMBER_JOINED | MESSAGE_KEYWORD | TASK_CREATED | TASK_STATUS_CHANGED | TASK_ASSIGNED),
                triggerConfig (JSON),
                actionType (AI_AGENT | NOTIFY | CREATE_TASK | POST_CHANNEL),
                actionConfig (JSON)
```

---

## 5. Authentication & Authorization

### Registration Flow

1. `POST /api/auth/register` — user provides email, password, org name.
2. Auth Service hashes password (bcryptjs, 10 rounds), creates `User` + `Organization` + `WorkspaceMember(OWNER)`.
3. Returns JWT.

### Login Flow

1. `POST /api/auth/login` — user provides email + password.
2. Auth Service verifies hash, signs JWT with `JWT_SECRET`.
3. Frontend stores token; includes it as `Authorization: Bearer <token>` on all subsequent requests.

### Invitation Flow

1. Admin creates invitation via Core Service — generates a signed token, stores `Invitation` record.
2. Resend sends an email with a link containing the token.
3. Invitee hits `POST /api/auth/register-with-invite` — creates user account, binds to org.

### Authorization Model

- **JWT** carries `userId` and `orgId` — services trust the token after signature verification.
- **Roles**: `OWNER > ADMIN > MEMBER` — enforced at route level in NestJS guards.
- **Wiki permissions**: per-page, per-user `VIEW | COMMENT | EDIT` grants through `WikiPageShare`.

---

## 6. Real-time Architecture

```
Core Service
    │
    │  PUBLISH event to Redis channel "org:{orgId}"
    ▼
Redis Pub/Sub
    │
    │  SUBSCRIBE "org:{orgId}"
    ▼
Realtime Service
    │
    │  SSE stream to each connected browser client
    ▼
Web Client (EventSource)
    │
    │  dispatch to Zustand store
    ▼
React component re-renders
```

Event types include: `message.created`, `message.updated`, `reaction.added`, `conversation.updated`, `task.updated`, `notification`, etc.

---

## 7. File Storage

- Files uploaded through the frontend go to `POST /api/upload`.
- Core Service's `UploadModule` writes them to **Google Cloud Storage** and returns a signed URL.
- Chat attachments (`ChatAttachment`) and document files (`DocumentFile`) store the GCS URI.
- The AI Service reads GCS URIs to chunk and embed documents for RAG.

---

## 8. Video Conferencing

- **LiveKit** (self-hosted or cloud) handles media routing.
- When a user joins an Office room, Core Service calls `livekit-server-sdk` to generate a LiveKit access token.
- The frontend uses `@livekit/components-react` to render the video grid and controls.
- Room participants are tracked in `OfficeRoomParticipant` for presence display.

---

## 9. Infrastructure & Deployment

### Development

```yaml
# docker-compose.yml (root)
services:
  postgres:   image: pgvector/pgvector:pg16   port: 5432
  redis:      image: redis:7-alpine           port: 6379
  livekit:    image: livekit/livekit-server   ports: 7880-7881, 50100-50200/udp
```

Run services with `make up-infra`, then start each app individually.

### Production

Multi-stage Dockerfiles live in `/infrastructure/`. The production compose:
- Uses compiled images (no source mounted).
- Includes health checks for all services.
- Supports Cloudflare Tunnel for exposing services without open ports.
- Each service is independently scalable.

### Port Map

| Service | Dev Port |
|---|---|
| Gateway | 2991 |
| Auth Service | 2992 |
| Core Service | 2993 |
| Realtime Service | 2996 |
| Web (prod) | 2997 |
| Web (dev) | 9999 |
| AI Service | 8001 |

---

## 10. Tech Stack Summary

| Category | Technology | Version |
|---|---|---|
| Monorepo | Nx | 22.6 |
| Package manager | pnpm | 10.33 |
| Backend framework | NestJS | 11.0 |
| Frontend framework | Next.js + React | 16.1 + 19.0 |
| AI framework | FastAPI + LangGraph | latest + 1.0 |
| Language (backend) | TypeScript | 5.9 |
| Language (AI) | Python | 3.12 |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 6.7 |
| Vector search | pgvector | pg16 |
| Cache / pub-sub | Redis | 7 |
| Video | LiveKit | latest |
| File storage | Google Cloud Storage | — |
| Email sending | Resend | — |
| Email integration | Gmail API (Google OAuth) | — |
| LLM providers | OpenAI, Google Gemini | — |
| Observability (AI) | Langfuse | — |
| Styling | Tailwind CSS v4 | 3.4 |
| UI components | shadcn/ui (base-nova) | — |
| Rich editor | BlockNote + TipTap | 0.51 + 3.23 |
| State management | Zustand | 5.0 |
| Flow canvas | ReactFlow | 12.11 |
| Drag and drop | dnd-kit | 6.3 |
| i18n | next-intl | 4.9 |
| Testing | Jest / Pytest / Playwright | 30 / 9 / 1.36 |
