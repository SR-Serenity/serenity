/* eslint-disable max-len */
type WikiSeedBlock = Record<string, unknown>;

export type WikiSeedPage = {
  title: string;
  icon: string;
  coverColor?: string;
  contentMarkdown: string;
  contentJson?: WikiSeedBlock[];
};

const imageUrls = {
  onboarding:
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80',
  delivery:
    'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80',
  incident:
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
  architecture:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
  roadmap:
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1600&q=80',
  design:
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1600&q=80',
};

const h = (level: 1 | 2 | 3, content: string): WikiSeedBlock => ({
  type: 'heading',
  props: { level },
  content,
});

const p = (content: string): WikiSeedBlock => ({
  type: 'paragraph',
  content,
});

const quote = (content: string): WikiSeedBlock => ({
  type: 'quote',
  content,
});

const bullet = (content: string): WikiSeedBlock => ({
  type: 'bulletListItem',
  content,
});

const numbered = (content: string): WikiSeedBlock => ({
  type: 'numberedListItem',
  content,
});

const checklist = (content: string, checked = false): WikiSeedBlock => ({
  type: 'checkListItem',
  props: { checked },
  content,
});

const image = (url: string, caption: string): WikiSeedBlock => ({
  type: 'image',
  props: {
    url,
    caption,
    name: caption,
    previewWidth: 760,
  },
});

export const wikiSeedPages: WikiSeedPage[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. New Teammate Onboarding
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'New Teammate Onboarding',
    icon: 'user-plus',
    coverColor: '#2563EB',
    contentMarkdown: `# New Teammate Onboarding

![Team onboarding workshop](${imageUrls.onboarding})

Welcome to the team. This page is the single source of truth for your first two weeks. Read it fully on Day 1, then check off each item as you go. If anything is unclear or out of date, fix it — keeping this page accurate is part of onboarding.

## Who to talk to

| Question | Go to |
|---|---|
| Workspace access, accounts, SSO | David Miller (Backend Engineer) |
| Local dev environment, Docker, services | Bob Chen (Senior Software Engineer) |
| Product overview, features, roadmap | Alex Vance (Engineering Lead) |
| Design system, Figma access, brand | Emily Rose (UI/UX Designer) |
| Marketing content, press access | Sarah Connor (Head of Marketing) |
| Anything else | Drop a message in **#general** |

## Day 1: accounts and context

Before touching code, make sure you can navigate the workspace and understand the team.

- Accept the workspace invitation email and set your display name and profile photo.
- Join the channels: **#general**, **#random**, **#engineering** (if you are in engineering), **#marketing** (if you are in marketing or design).
- Read this page, the Engineering Delivery Guide, and the Incident Response Runbook.
- Confirm your department assignment in Settings → Profile.
- Introduce yourself in **#general** — name, where you are based, and what you are working on.
- Ask your onboarding buddy for the current sprint goal and the starter task assigned to you.
- Review the Q3 Product Roadmap wiki page to understand what the team is building this quarter.

## Day 2: local development environment

The workspace runs as an Nx monorepo with pnpm. Set up the full local stack before making changes.

### Prerequisites

- Node.js 20 LTS
- Docker Desktop (for PostgreSQL and Redis)
- pnpm 9 (install with \`npm install -g pnpm@9\`)

### Setup steps

\`\`\`bash
# 1. Clone the repo and install dependencies
git clone <repo-url> serenity
cd serenity
pnpm install

# 2. Generate Prisma client
pnpm prisma:generate

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Run database migrations and seed
pnpm prisma:migrate
pnpm prisma:seed

# 5. Start services (each in a separate terminal)
pnpm nx serve auth-service     # port 3001
pnpm nx serve core-service     # port 2993
pnpm nx serve gateway          # port 3000
pnpm nx serve realtime-service # port 3002
pnpm nx serve ai-service       # port 8000
pnpm nx dev web                # port 9999
\`\`\`

Open http://localhost:9999 and log in with the seeded account. The default password for all seed users is \`password123\`.

### Common setup issues

- **Docker containers not healthy**: run \`docker compose ps\` to check. If postgres is not running, check disk space.
- **Prisma generate fails**: make sure \`DATABASE_URL\` is set in \`apps/auth-service/.env\`. Ask David Miller for the local env file template.
- **Port 3000 already in use**: check if another process is using it with \`lsof -i :3000\` and stop it.
- **pnpm install fails on Node 18**: upgrade to Node 20 LTS. The monorepo requires the \`--experimental-vm-modules\` flag available in Node 20.

If you hit an issue not listed here, fix it and add it to this list.

## Day 3: product walkthrough

Your onboarding buddy will walk through the live product with you. The walkthrough covers:

1. **Login and organization selection** — how multi-tenancy works in the UI.
2. **Chat channels and direct messages** — public channels, DMs, message threads.
3. **Wiki** — page creation, editor, search, visibility controls.
4. **Calendar** — meetings, personal tasks, room booking.
5. **Office rooms** — room types, booking flow.
6. **AI assistant** — how to invoke it, which agents it routes to, how context is used.

The walkthrough focuses on real workflows, not feature lists. After it, you should be able to answer: "What job is each screen doing for the user?"

## Week 1 checklist

- [ ] Workspace access confirmed and profile complete.
- [ ] Local development stack running end-to-end.
- [ ] All relevant channels joined.
- [ ] Product walkthrough completed with buddy.
- [ ] Current sprint goal understood.
- [ ] Starter task assigned and picked up.

## First contribution

The first task should be small, self-contained, and easy to verify. Good examples:

- Improve empty state copy on a page that currently shows nothing useful.
- Add a missing validation test for a known edge case.
- Fix a broken seed page in the wiki.
- Document a setup issue you hit that future teammates will also hit.

Before opening a pull request, write in the PR description:

- **What changed** and in which files.
- **Why it changed** — the user-facing or technical reason.
- **How you verified it** — commands run, manual checks.
- **What was left out** intentionally and why.

See the Engineering Delivery Guide for the full PR standard.

## Week 2 milestones

By the end of your second week you should:

- Have one merged pull request.
- Be able to run the test suites for the service you are working in.
- Have added or updated at least one wiki page with something you learned.
- Have attended a sprint planning or retrospective.
- Know the names and roles of everyone on the team.

## Buddy responsibilities

The onboarding buddy is responsible for the teammate's first two weeks, not just Day 1.

- [ ] Workspace access confirmed on Day 1.
- [ ] Local environment running by end of Day 2.
- [ ] Product walkthrough completed by end of Day 3.
- [ ] Starter task selected and context provided.
- [ ] Daily check-in for the first five working days.
- [ ] First pull request reviewed and merged.
- [ ] Retro: what would have helped this teammate more?
`,
    contentJson: [
      image(imageUrls.onboarding, 'Team onboarding workshop'),
      p('Welcome to the team. This page is the single source of truth for your first two weeks. Read it fully on Day 1, then check off each item as you go.'),
      h(2, 'Who to talk to'),
      bullet('Workspace access, accounts, SSO → David Miller'),
      bullet('Local dev environment, Docker, services → Bob Chen'),
      bullet('Product overview, features, roadmap → Alex Vance'),
      bullet('Design system, Figma access, brand → Emily Rose'),
      bullet('Marketing content, press access → Sarah Connor'),
      h(2, 'Day 1: accounts and context'),
      bullet('Accept the workspace invitation and set your display name and photo.'),
      bullet('Join #general, #random, and your team channel.'),
      bullet('Read this page, the Engineering Delivery Guide, and the Incident Response Runbook.'),
      bullet('Confirm your department assignment in Settings → Profile.'),
      bullet('Introduce yourself in #general.'),
      h(2, 'Day 2: local development environment'),
      p('The workspace runs as an Nx monorepo with pnpm. Prerequisites: Node.js 20 LTS, Docker Desktop, pnpm 9. Default password for all seed users is password123.'),
      h(2, 'Day 3: product walkthrough'),
      numbered('Login and organization selection.'),
      numbered('Chat channels and direct messages.'),
      numbered('Wiki — page creation, editor, search.'),
      numbered('Calendar — meetings, tasks, room booking.'),
      numbered('Office rooms.'),
      numbered('AI assistant — agents, routing, context.'),
      h(2, 'Week 1 checklist'),
      checklist('Workspace access confirmed and profile complete'),
      checklist('Local development stack running end-to-end'),
      checklist('All relevant channels joined'),
      checklist('Product walkthrough completed with buddy'),
      checklist('Current sprint goal understood'),
      checklist('Starter task assigned and picked up'),
      h(2, 'Buddy responsibilities'),
      checklist('Workspace access confirmed on Day 1'),
      checklist('Local environment running by end of Day 2'),
      checklist('Product walkthrough completed by end of Day 3'),
      checklist('First pull request reviewed and merged'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Engineering Delivery Guide
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'Engineering Delivery Guide',
    icon: 'code',
    coverColor: '#0F766E',
    contentMarkdown: `# Engineering Delivery Guide

![Engineering team planning work](${imageUrls.delivery})

This guide describes how engineering work moves from idea to shipped change. Follow it for features, bug fixes, and service changes. It is intentionally practical — if a step does not apply to a small fix, use judgment.

## Principles

- Small, reviewable changes ship faster and break less than large ones.
- Behavior, tests, and documentation belong in the same pull request when they are logically connected.
- Use the existing architecture before introducing new abstractions.
- Failure states must be visible: clear error messages, observable logs, recoverable operations.
- All tasks run through Nx — never invoke framework tooling directly in CI.

## Git branching strategy

We use trunk-based development with short-lived feature branches.

| Branch | Purpose |
|---|---|
| \`main\` | Production-ready code. Protected — no direct pushes. |
| \`staging\` | Integration branch for testing before merging to main. |
| \`feat/<ticket>-<short-description>\` | Feature work, e.g. \`feat/42-wiki-search-unicode\` |
| \`fix/<ticket>-<short-description>\` | Bug fixes, e.g. \`fix/46-cookie-expiry-mismatch\` |
| \`chore/<description>\` | Dependency updates, config changes, cleanup |

Branch names should be lowercase with hyphens. Avoid generic names like \`dev\` or \`test\`.

### Commit messages

Use conventional commits format: \`type(scope): short description\`

Examples:
- \`feat(wiki): add full-text search for Vietnamese characters\`
- \`fix(auth): correct cookie expiry to match JWT lifetime\`
- \`chore(deps): upgrade Prisma to 5.14.0\`
- \`docs(onboarding): add Node 20 setup requirement\`

## Before writing code

Read the surrounding code first. Understand the service boundary, existing DTOs, and tests. If the change touches more than one service (web, gateway, core-service, auth-service), write down the data flow before editing.

For user-facing changes, confirm:

- Which user role can perform the action (OWNER, ADMIN, MEMBER)?
- Which organization owns the data — all queries must be scoped to \`orgId\`.
- What the empty, loading, error, and success states show.
- Whether realtime events need to fire after the change.
- Whether the AI service needs to reindex data after the change (e.g. wiki pages, contacts).

## Implementation workflow

1. Start with the smallest vertical path that proves the behavior works end-to-end.
2. Keep naming consistent with nearby modules (same field names, same error codes).
3. Add validation at service boundaries — the gateway and each service entry point.
4. Update DTOs and client-side TypeScript types in the same commit.
5. Write tests around behavior, not internal implementation details.
6. Run the Nx build and test targets before pushing.

\`\`\`bash
# Before pushing a change to auth-service
pnpm nx test auth-service
pnpm nx build auth-service

# Before pushing a change to core-service
pnpm nx test core-service
pnpm nx build core-service

# Before pushing a frontend change
pnpm nx build web
pnpm nx typecheck web

# Run all affected tests in CI
pnpm nx affected --target=test --base=main
\`\`\`

## Pull request standard

A pull request should be reviewable in one sitting (under 400 lines of meaningful change). If it touches too many concerns, split it before asking for review.

**Required sections in every PR description:**

- **Problem**: what was broken, missing, or slow.
- **Solution**: what changed and why this approach was chosen.
- **Verification**: exact commands run and manual steps taken.
- **Risk**: migrations, auth changes, background jobs, or user-visible behavior changes.
- **Screenshots** (if the change affects any UI).

Assign at least one reviewer. The author should not merge their own PR unless it is a trivial chore with no reviewers available.

## Code review expectations

Reviewers look for:

- Authorization checks scoped correctly to \`orgId\` and user role.
- Database writes using the correct owner and relation fields.
- Error messages that are actionable for the end user and debuggable for on-call.
- Tests that cover the behavior that could regress in the future.
- No hardcoded secrets, no debug \`console.log\`, no commented-out code.

Leave comments as "blocking" (must fix before merge) or "non-blocking" (suggestion). Approve only when all blocking comments are resolved.

## Deployment process

Deployments are triggered by GitHub Actions on merge to \`staging\` or \`main\`.

| Target | Trigger | Who can approve |
|---|---|---|
| Staging | Merge to \`staging\` | Any engineer |
| Production | Merge to \`main\` | Alex Vance or David Miller |

Never merge to \`main\` without a staging validation step unless it is a hotfix with Alex's approval.

### Hotfix process

1. Branch from \`main\`: \`fix/<issue>-hotfix\`.
2. Make the smallest possible change.
3. Get one approval from Alex Vance or a senior engineer.
4. Merge to \`main\` and tag the release.
5. Back-merge \`main\` into \`staging\` immediately after.

## Done means shipped knowledge

If the change teaches the team something new — a non-obvious pattern, a found bug class, a useful debugging trick — update the wiki. Chat messages are for discussion; the wiki is for durable decisions.
`,
    contentJson: [
      image(imageUrls.delivery, 'Engineering team planning work'),
      p('This guide describes how engineering work moves from idea to shipped change. Follow it for features, bug fixes, and service changes.'),
      h(2, 'Principles'),
      bullet('Small, reviewable changes ship faster and break less.'),
      bullet('Behavior, tests, and documentation belong in the same pull request.'),
      bullet('Use the existing architecture before introducing new abstractions.'),
      bullet('All tasks run through Nx — never invoke framework tooling directly in CI.'),
      h(2, 'Git branching strategy'),
      p('Trunk-based development with short-lived feature branches. main is protected. staging is the integration branch. Feature branches: feat/<ticket>-<description>, fix/<ticket>-<description>.'),
      h(2, 'Before writing code'),
      bullet('Read the surrounding code first — service boundary, DTOs, tests.'),
      bullet('All queries must be scoped to orgId.'),
      bullet('Confirm which user role can perform the action.'),
      bullet('Confirm whether realtime events or AI reindexing are needed.'),
      h(2, 'Implementation workflow'),
      numbered('Start with the smallest vertical path end-to-end.'),
      numbered('Keep naming consistent with nearby modules.'),
      numbered('Add validation at service boundaries.'),
      numbered('Update DTOs and client TypeScript types together.'),
      numbered('Write behavior tests, not implementation tests.'),
      numbered('Run nx test and nx build before pushing.'),
      h(2, 'Pull request standard'),
      p('Required: Problem, Solution, Verification, Risk, Screenshots. Assign at least one reviewer. Do not self-merge except for trivial chores.'),
      h(2, 'Deployment process'),
      bullet('Staging: triggered on merge to staging, approved by any engineer.'),
      bullet('Production: triggered on merge to main, approved by Alex Vance or David Miller.'),
      bullet('Hotfix: branch from main, smallest possible change, back-merge to staging immediately.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Incident Response Runbook
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'Incident Response Runbook',
    icon: 'shield',
    coverColor: '#DC2626',
    contentMarkdown: `# Incident Response Runbook

![Operations room during incident response](${imageUrls.incident})

Use this runbook when a production or staging issue affects users, data integrity, security, or critical development workflows. The goal is to restore service safely, communicate clearly, and leave behind a useful record.

## Severity levels

| Severity | Meaning | Response time | Examples |
|---|---|---|---|
| SEV1 | Critical user impact or data risk | Immediate, all hands | Login unavailable for all users, data leak, destructive migration |
| SEV2 | Major workflow degraded | Within 30 minutes | Wiki saves failing, calendar unavailable, chat delivery delayed > 5 min |
| SEV3 | Limited impact or workaround available | Within 2 hours | One integration failing, non-critical background job delayed, single-user issue |

## On-call rotation

| Week | Primary | Backup |
|---|---|---|
| Sprint 12 | Bob Chen | David Miller |
| Sprint 13 | David Miller | John Park |
| Sprint 14 | John Park | Bob Chen |

For SEV1, wake the primary on-call immediately regardless of time zone. For SEV2, ping in **#engineering**. For SEV3, create a task and handle during business hours.

## First 10 minutes

These steps apply to SEV1 and SEV2. Do them in order, do not skip.

1. **Name an incident lead.** The on-call engineer is the default lead. Alex Vance takes over for SEV1.
2. **Create a dedicated thread** in **#general** titled: \`[INCIDENT] <short description> <date>\`.
3. **Write the current impact** in one sentence and post it immediately: who is affected, what they cannot do.
4. **Stop risky deployments.** No merges to staging or main until the incident lead clears them.
5. **Collect initial data**: logs from the suspected service, recent deploys (last 24h), error rates.

## Triage questions

Ask and answer these before making any changes:

- Is the issue still happening, or did it stop on its own?
- Which users or organizations are affected — all, or a subset?
- Did this start after a deploy, migration, config change, or dependency update?
- Is there a safe rollback path (revert commit, re-run migration down)?
- Could the proposed fix make data integrity worse?

## Common diagnostic commands

\`\`\`bash
# Service health
curl http://localhost:3000/health        # gateway
curl http://localhost:2993/health        # core-service
curl http://localhost:3001/health        # auth-service
curl http://localhost:8000/health        # ai-service

# Infrastructure logs
docker compose logs postgres --tail=200 --follow
docker compose logs redis --tail=200 --follow

# Build and test the suspected service
pnpm nx build core-service
pnpm nx test core-service

# Check recent migration status
pnpm prisma migrate status
\`\`\`

## Rollback procedure

If a deploy caused the incident:

1. Identify the commit hash of the last known-good deploy from the GitHub Actions run.
2. Create a \`fix/<issue>-rollback\` branch from that commit.
3. Get Alex Vance to approve an emergency merge to \`main\`.
4. Monitor error rates for 15 minutes after rollback.

If a migration caused the incident:

1. **Do not run \`migrate down\` without Alex Vance's explicit approval.**
2. Check whether data written since the migration would be lost.
3. If rollback is safe, run \`pnpm prisma migrate resolve --rolled-back <migration-name>\`.

## Communication template

Post updates on a 30-minute cadence for SEV1, 1-hour cadence for SEV2:

> **Status**: investigating | mitigating | monitoring | resolved
> **Impact**: who is affected and what they cannot do.
> **Action**: what is being done right now.
> **Next update**: exact time for the next update.

## Resolution checklist

- [ ] User impact has stopped.
- [ ] Root cause identified and documented.
- [ ] Data integrity verified (row counts, spot checks).
- [ ] Any temporary mitigation documented in the incident thread.
- [ ] Follow-up tasks created and assigned.
- [ ] Incident thread marked resolved.

## Post-mortem

Write the post-mortem within one business day of resolution. Post it as a reply to the incident thread, then add a summary to this page under "Recent incidents."

Post-mortem template:

- **Date and duration**: when the incident started and how long it lasted.
- **Impact**: how many users or organizations were affected.
- **Timeline**: key events with exact timestamps.
- **Root cause**: what actually went wrong, not just symptoms.
- **Resolution**: what restored service.
- **Prevention**: what change would prevent this class of incident.
- **Action items**: specific tasks created, with owners and due dates.

Keep it factual. The purpose is to improve the system, not assign blame.

## Recent incidents

| Date | SEV | Service | Duration | Root cause | Post-mortem |
|---|---|---|---|---|---|
| — | — | — | — | No incidents recorded yet | — |
`,
    contentJson: [
      image(imageUrls.incident, 'Operations room during incident response'),
      p('Use this runbook when a production or staging issue affects users, data integrity, security, or critical development workflows.'),
      h(2, 'Severity levels'),
      bullet('SEV1: critical user impact or data risk — immediate, all hands.'),
      bullet('SEV2: major workflow degraded — within 30 minutes.'),
      bullet('SEV3: limited impact or workaround available — within 2 hours.'),
      h(2, 'On-call rotation'),
      bullet('Sprint 12: Bob Chen (primary), David Miller (backup).'),
      bullet('Sprint 13: David Miller (primary), John Park (backup).'),
      bullet('Sprint 14: John Park (primary), Bob Chen (backup).'),
      h(2, 'First 10 minutes'),
      numbered('Name an incident lead — on-call engineer by default, Alex Vance for SEV1.'),
      numbered('Create a dedicated thread in #general.'),
      numbered('Write the current impact in one sentence.'),
      numbered('Stop risky deployments.'),
      numbered('Collect logs, recent deploys, error rates.'),
      h(2, 'Communication template'),
      quote('Status: investigating | mitigating | monitoring | resolved. Impact: who, what. Action: what now. Next update: exact time.'),
      h(2, 'Resolution checklist'),
      checklist('User impact has stopped'),
      checklist('Root cause identified and documented'),
      checklist('Data integrity verified'),
      checklist('Follow-up tasks created and assigned'),
      checklist('Post-mortem written within one business day'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. API Architecture & Service Map
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'API Architecture & Service Map',
    icon: 'server',
    coverColor: '#7C3AED',
    contentMarkdown: `# API Architecture & Service Map

![Server infrastructure diagram](${imageUrls.architecture})

This page documents how Serenity's backend is structured: which services exist, what they own, how they communicate, and where to start debugging when something goes wrong. Update this page when a service boundary changes or a new service is added.

## Services

| Service | Port | Runtime | Owner | Responsibility |
|---|---|---|---|---|
| gateway | 3000 | NestJS | Alex Vance | Routes external requests to internal services. Validates JWT, injects auth context, rate-limits. |
| auth-service | 3001 | NestJS + Prisma | David Miller | User registration, login, JWT issuance, org creation, invitations, departments. |
| core-service | 2993 | NestJS + Prisma | Alex Vance | Channels, messages, wiki, calendar, tasks, contacts, office rooms, files. |
| realtime-service | 3002 | NestJS + Socket.io | Bob Chen | WebSocket push events. Broadcasts new messages, wiki changes, and calendar updates to connected clients. |
| ai-service | 8000 | FastAPI + LangGraph | Huy (creator) | AI agent routing, tool calling, context compression, evaluation pipeline. |
| web | 9999 | Next.js 16 | Emily Rose, John Park | Frontend — App Router, React 19, Tailwind CSS v4. |

## Request flow

### Standard authenticated request

\`\`\`
Client (browser)
  → POST /api/messages (port 3000, gateway)
  → Gateway validates JWT, extracts orgId + userId
  → Gateway proxies to Core Service with x-auth-user header
  → Core Service writes to PostgreSQL
  → Core Service publishes event to Redis pub/sub
  → Realtime Service receives event, broadcasts to WebSocket subscribers
\`\`\`

### AI chat request

\`\`\`
Client
  → POST /api/ai/chat (port 3000, gateway)
  → Gateway validates JWT, forwards to AI Service
  → AI Service identifies intent, selects agent
  → Agent calls Core Service internal APIs (wiki, calendar, contacts, chat)
  → AI Service composes response with citations
  → Response returned to client
\`\`\`

### Internal service-to-service calls

Internal calls bypass the gateway and use the \`x-internal-api-token\` header. The token is stored in each service's \`.env\` file and is never exposed publicly.

\`\`\`
AI Service → Core Service: GET /api/internal/wiki/pages
AI Service → Core Service: GET /api/internal/calendar/items
AI Service → Core Service: POST /api/internal/contacts/search
AI Service → Core Service: GET /api/internal/chat/messages
\`\`\`

## Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| Primary database | PostgreSQL 15 | All persistent data: users, messages, wiki, calendar, contacts |
| Cache & broker | Redis 7 | Session cache, pub/sub events, rate limit counters |
| File storage | Local disk (dev) / S3 (prod) | Document uploads, user avatars |

## Key API endpoints

| Endpoint | Service | Auth | Description |
|---|---|---|---|
| POST /api/auth/login | auth-service | Public | Authenticate and receive JWT |
| POST /api/auth/register | auth-service | Public | Create user account |
| GET /api/messages/:conversationId | core-service | JWT | Fetch paginated messages |
| POST /api/wiki/pages | core-service | JWT | Create a new wiki page |
| GET /api/calendar/items | core-service | JWT | List calendar events and tasks |
| POST /api/ai/chat | ai-service | JWT | Send message to AI assistant |
| POST /api/internal/v1/ai/chat | ai-service | Internal token | Evaluation endpoint (bypasses rate limit) |

## Environment variables (local dev)

All \`.env\` files live at the app root (\`apps/<service>/.env\`). Never commit them. Ask David Miller for the team template.

Critical variables per service:

\`\`\`bash
# auth-service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity
JWT_SECRET=<local-dev-secret>
JWT_EXPIRES_IN=24h

# core-service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity
REDIS_URL=redis://localhost:6379
AI_SERVICE_INTERNAL_URL=http://localhost:8000
INTERNAL_API_TOKEN=<shared-dev-token>

# ai-service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity
CORE_SERVICE_INTERNAL_URL=http://localhost:2993
INTERNAL_API_TOKEN=<shared-dev-token>
ANTHROPIC_API_KEY=<your-key>
\`\`\`

## Health checks

Run these after starting the local stack to confirm all services are up:

\`\`\`bash
curl http://localhost:3000/health      # {"status":"ok","service":"gateway"}
curl http://localhost:2993/health     # {"status":"ok","service":"core-service"}
curl http://localhost:3001/health     # {"status":"ok","service":"auth-service"}
curl http://localhost:8000/health     # {"status":"ok","service":"ai-service"}
\`\`\`

If the gateway health check fails, start Core Service first — the gateway depends on it at startup.

## Service ownership

When something breaks, go to the owner first.

| Area | Owner | Backup |
|---|---|---|
| Auth, JWT, invitations | David Miller | Alex Vance |
| Core API, data models, Prisma | Alex Vance | David Miller |
| Realtime, WebSocket | Bob Chen | John Park |
| AI agents, evaluation pipeline | Huy (creator) | Alex Vance |
| Frontend, design system | Emily Rose | John Park |
| Infrastructure, Docker, CI/CD | Bob Chen | David Miller |
| Marketing, analytics integrations | Sarah Connor | Alice Nguyen |
`,
    contentJson: [
      image(imageUrls.architecture, 'Server infrastructure diagram'),
      p('This page documents how Serenity\'s backend is structured: which services exist, what they own, how they communicate, and where to start debugging when something goes wrong.'),
      h(2, 'Services'),
      bullet('gateway (port 3000) — routes external requests, validates JWT, rate-limits. Owner: Alex Vance.'),
      bullet('auth-service (port 3001) — users, login, JWT, orgs, invitations. Owner: David Miller.'),
      bullet('core-service (port 2993) — channels, wiki, calendar, tasks, contacts. Owner: Alex Vance.'),
      bullet('realtime-service (port 3002) — WebSocket push events. Owner: Bob Chen.'),
      bullet('ai-service (port 8000) — AI agents, tool calling, evaluation. Owner: Huy (creator).'),
      bullet('web (port 9999) — Next.js 16 frontend. Owners: Emily Rose, John Park.'),
      h(2, 'Request flow'),
      p('Standard request: Client → Gateway (JWT validation) → Core Service → PostgreSQL → Redis pub/sub → Realtime Service → WebSocket clients.'),
      p('AI request: Client → Gateway → AI Service → Agent → Core Service internal APIs → response with citations.'),
      h(2, 'Infrastructure'),
      bullet('PostgreSQL 15 — primary store for all persistent data.'),
      bullet('Redis 7 — session cache, pub/sub events, rate limit counters.'),
      bullet('S3 (prod) / local disk (dev) — file and avatar storage.'),
      h(2, 'Health checks'),
      p('gateway: port 3000, core-service: port 2993, auth-service: port 3001, ai-service: port 8000. Start Core Service first — gateway depends on it at startup.'),
      h(2, 'Service ownership'),
      bullet('Auth, JWT, invitations → David Miller (backup: Alex Vance)'),
      bullet('Core API, data models → Alex Vance (backup: David Miller)'),
      bullet('Realtime, WebSocket → Bob Chen (backup: John Park)'),
      bullet('AI agents, evaluation → Huy/creator (backup: Alex Vance)'),
      bullet('Frontend, design system → Emily Rose (backup: John Park)'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Q3 2025 Product Roadmap
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'Q3 2025 Product Roadmap',
    icon: 'map',
    coverColor: '#D97706',
    contentMarkdown: `# Q3 2025 Product Roadmap

![Team planning roadmap on whiteboard](${imageUrls.roadmap})

This page tracks what the team is building in Q3 2025 (July–September). It is updated after every sprint planning session. The last update was after Sprint 12 planning on July 7, 2025.

**Owner**: Alex Vance
**Last updated by**: Alex Vance
**Next review**: Sprint 13 planning (July 21, 2025)

## Q3 objectives

1. **Ship the complete AI agent suite** — all six workspace agents (chat, wiki, calendar, contacts, mail, schedule) stable and scoring above 75% on the evaluation suite.
2. **Reach 10,000 active workspaces** — requires the self-serve onboarding flow and invitation improvements to ship by end of July.
3. **Launch publicly** — product launch event on September 15, supported by the press release and marketing campaign.

## Q3 key results

| Key Result | Target | Current | Status |
|---|---|---|---|
| AI agent evaluation pass rate | ≥ 75% all agents | wiki: 78%, chat: 81%, contacts: 91% | On track |
| Active workspaces | 10,000 | 6,200 | Behind |
| New signups per week | 500 | 312 | Behind |
| P95 API latency (gateway) | < 200 ms | 187 ms | On track |
| Uptime (production) | 99.9% | 99.95% | On track |

## Sprint 12 (July 7 – July 18, 2025)

**Sprint goal**: Complete AI evaluation pipeline and stabilize the agent suite.

| Task | Owner | Status | Notes |
|---|---|---|---|
| G-Eval metric integration | Huy (creator) | In progress | ETA: July 11 |
| Evaluation dataset — mail agent | Huy (creator) | In progress | 20 cases drafted |
| Evaluation dataset — schedule agent | Huy (creator) | Done | 15 cases, 87% pass |
| Calendar agent — dataset + scoring | Huy (creator) | Done | 82% pass rate |
| Contacts agent — dataset + scoring | Huy (creator) | Done | 91% pass rate |
| Fix race condition in token refresh | David Miller | Done | PR #44 merged |
| Wiki search — Unicode/Vietnamese fix | Mary Watson | Done | PR #47 merged |
| Mobile layout — wiki editor | Emily Rose | In progress | Mockups ready, dev TBD |
| Set up GitHub Actions for ai-service | John Park | In progress | ETA: July 14 |
| Add rate limiting to AI endpoint | Bob Chen | Todo | Starts July 14 |

## Sprint 13 preview (July 21 – August 1, 2025)

These items are confirmed for Sprint 13. Final scope to be set in the planning session on July 21.

- Move AI service behind the gateway (no direct external port access).
- Email notification system — new message and mention notifications.
- File attachment support in chat messages (images and PDFs, max 10 MB).
- Onboarding flow improvements — inline tour, better empty states.
- Self-serve workspace deletion.
- Localize UI strings for Vietnamese locale (John Park).

## Upcoming (Sprint 14+)

- Mobile application (React Native) — design starts Sprint 14.
- Advanced wiki permissions (department-level, page-level).
- AI memory across sessions — persist user preferences and context.
- Integration marketplace — Jira, GitHub, Slack import.
- SSO via Google Workspace and Microsoft Entra.

## Completed in Q2 2025

| Feature | Sprint | Notes |
|---|---|---|
| Wiki full-text search | Sprint 8 | Supports markdown content |
| Calendar room booking | Sprint 9 | Room A, B, Main Conference Room |
| Multi-org support | Sprint 9 | Users can belong to multiple orgs |
| AI chat assistant (basic) | Sprint 10 | Single-turn, no tool calls |
| Task management | Sprint 10 | Personal tasks with due dates |
| AI agents v1 (wiki, chat, calendar) | Sprint 11 | First agent suite shipped |
| Contacts directory | Sprint 11 | Employee + guest contacts |
| Office rooms | Sprint 11 | Open, focus, private, social types |

## Success metrics for September launch

Before the September 15 launch, all of the following must be true:

- [ ] All 7 AI agents pass the evaluation suite at ≥ 75%.
- [ ] Onboarding flow completes in under 3 minutes for a new user.
- [ ] P95 API latency below 200 ms on production under load test.
- [ ] Zero open SEV1 issues.
- [ ] Press release approved by Sarah Connor.
- [ ] Demo environment stable and seeded with realistic data.
- [ ] Support documentation published for all major features.
`,
    contentJson: [
      image(imageUrls.roadmap, 'Team planning roadmap on whiteboard'),
      p('This page tracks what the team is building in Q3 2025 (July–September). Owner: Alex Vance. Last updated after Sprint 12 planning on July 7, 2025.'),
      h(2, 'Q3 objectives'),
      numbered('Ship the complete AI agent suite — all six agents scoring above 75% on the evaluation suite.'),
      numbered('Reach 10,000 active workspaces — requires self-serve onboarding improvements by end of July.'),
      numbered('Launch publicly on September 15, supported by press release and marketing campaign.'),
      h(2, 'Q3 key results'),
      bullet('AI agent evaluation pass rate: ≥ 75% target. Current: wiki 78%, chat 81%, contacts 91%.'),
      bullet('Active workspaces: 10,000 target. Current: 6,200 — behind.'),
      bullet('P95 API latency: < 200 ms target. Current: 187 ms — on track.'),
      bullet('Production uptime: 99.9% target. Current: 99.95% — on track.'),
      h(2, 'Sprint 12 (July 7 – July 18, 2025)'),
      p('Sprint goal: Complete AI evaluation pipeline and stabilize the agent suite.'),
      bullet('G-Eval metric integration — Huy (creator) — In progress, ETA July 11.'),
      bullet('Evaluation dataset — mail agent — Huy (creator) — In progress, 20 cases drafted.'),
      bullet('Fix race condition in token refresh — David Miller — Done (PR #44).'),
      bullet('Wiki search Unicode/Vietnamese fix — Mary Watson — Done (PR #47).'),
      bullet('Mobile layout wiki editor — Emily Rose — In progress, mockups ready.'),
      h(2, 'Sprint 13 preview (July 21 – August 1, 2025)'),
      bullet('Move AI service behind the gateway.'),
      bullet('Email notification system — new message and mention notifications.'),
      bullet('File attachment support in chat (images and PDFs, max 10 MB).'),
      bullet('Localize UI strings for Vietnamese locale (John Park).'),
      h(2, 'Success metrics for September launch'),
      checklist('All 7 AI agents pass evaluation suite at ≥ 75%'),
      checklist('Onboarding flow under 3 minutes for a new user'),
      checklist('P95 API latency below 200 ms under load test'),
      checklist('Zero open SEV1 issues'),
      checklist('Press release approved by Sarah Connor'),
      checklist('Demo environment stable with realistic data'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Brand & Design Guidelines
  // ─────────────────────────────────────────────────────────────────────────
  {
    title: 'Brand & Design Guidelines',
    icon: 'palette',
    coverColor: '#DB2777',
    contentMarkdown: `# Brand & Design Guidelines

![Design workspace with color swatches](${imageUrls.design})

This page is the source of truth for how Serenity looks, feels, and speaks. It covers colors, typography, component patterns, and voice. Follow it when building UI, writing copy, or creating marketing assets. If you are unsure, ask Emily Rose (UI/UX Designer).

## Brand identity

**Name**: Serenity
**Tagline**: Your whole team, one place.
**Brand promise**: A calm, organized workspace that helps teams communicate clearly and ship faster.

**What Serenity is**: Focused. Reliable. Human.
**What Serenity is not**: Flashy, corporate, overwhelming.

## Color palette

All colors are defined as CSS variables in \`apps/web/src/app/global.css\`. **Never hardcode hex values in component files.** Use the CSS variable or the Tailwind utility class.

| Token | CSS variable | Hex | Tailwind class | Use for |
|---|---|---|---|---|
| Brand | \`--brand\` | \`#070738\` | \`bg-brand\`, \`text-brand\` | Primary actions, key text |
| Brand hover | \`--brand-hover\` | \`#0e0e5a\` | \`hover:bg-brand-hover\` | Interactive hover states |
| Brand light | \`--brand-light\` | \`#e8e8f5\` | \`bg-brand-light\` | Light tint backgrounds |
| Brand surface | \`--brand-surface\` | \`#f4f4fb\` | \`bg-brand-surface\` | Page and panel backgrounds |
| Brand muted | \`--brand-muted\` | \`#6b6b9a\` | \`text-brand-muted\` | Secondary and caption text |
| Brand border | \`--brand-border\` | \`#d0d0e8\` | \`border-brand-border\` | Subtle dividers, input borders |

### Semantic status colors

Use these for system states only. Do not use green for decorative accents.

| Meaning | Tailwind | Use |
|---|---|---|
| Success | \`text-green-600\`, \`bg-green-50\` | Completed tasks, passed evaluations |
| Warning | \`text-amber-600\`, \`bg-amber-50\` | Approaching deadline, degraded service |
| Danger | \`text-red-600\`, \`bg-red-50\` | Errors, SEV1 incidents, destructive actions |
| Info | \`text-blue-600\`, \`bg-blue-50\` | Neutral informational messages |

## Typography

We use the system font stack for performance. No custom fonts are loaded.

| Level | Element | Tailwind | Use |
|---|---|---|---|
| Display | \`h1\` | \`text-3xl font-bold\` | Page titles, hero text |
| Heading 1 | \`h2\` | \`text-2xl font-semibold\` | Section titles |
| Heading 2 | \`h3\` | \`text-lg font-semibold\` | Subsection titles |
| Body | \`p\` | \`text-sm\` | Default body text |
| Caption | \`span\` | \`text-xs text-brand-muted\` | Timestamps, metadata, hints |
| Code | \`code\` | \`font-mono text-sm\` | Inline code, file paths |

Line height is \`leading-relaxed\` (1.625) for body text and \`leading-tight\` (1.25) for headings.

## Spacing and layout

Use Tailwind's built-in spacing scale. Do not create custom \`--space-*\` CSS variables.

| Context | Value |
|---|---|
| Component internal padding | \`p-3\` (12px) or \`p-4\` (16px) |
| Section gap | \`gap-4\` (16px) or \`gap-6\` (24px) |
| Page horizontal padding | \`px-6\` (24px) on desktop, \`px-4\` (16px) on mobile |
| Card border radius | \`rounded-lg\` (8px) |
| Button border radius | \`rounded-md\` (6px) |

## Component patterns

### Buttons

- **Primary**: \`bg-brand text-white hover:bg-brand-hover rounded-md px-4 py-2\`
- **Secondary**: \`border border-brand-border bg-white text-brand hover:bg-brand-light\`
- **Destructive**: \`bg-red-600 text-white hover:bg-red-700\`
- **Ghost**: \`text-brand-muted hover:bg-brand-light hover:text-brand\`

Never use \`outline\` or \`ghost\` buttons for primary actions. Primary actions always use the filled primary button.

### Forms

- Label: \`text-sm font-medium text-brand\`
- Input: \`border border-brand-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand\`
- Error message: \`text-xs text-red-600 mt-1\`
- Help text: \`text-xs text-brand-muted mt-1\`

### Status badges

- \`TODO\`: \`bg-gray-100 text-gray-600\`
- \`IN PROGRESS\`: \`bg-blue-50 text-blue-600\`
- \`DONE\`: \`bg-green-50 text-green-600\`
- \`OVERDUE\`: \`bg-red-50 text-red-600\`

## Icons

We use Lucide icons (\`lucide-react\`). Do not import icon sets from other libraries unless Emily approves the addition.

Icon sizing:
- In buttons: \`h-4 w-4\`
- Standalone or in cards: \`h-5 w-5\`
- Feature illustrations: \`h-8 w-8\` or \`h-10 w-10\`

Always pair icons with visible text labels or \`aria-label\` attributes.

## Voice and tone

| Context | Tone | Example |
|---|---|---|
| Empty states | Helpful, inviting | "No messages yet. Start the conversation." |
| Error messages | Clear, non-blaming | "Couldn't save the page. Please try again." |
| Success messages | Concise, positive | "Changes saved." |
| Destructive confirmation | Direct, specific | "Delete this page? This cannot be undone." |
| Onboarding | Warm, practical | "You're all set. Here's what to explore first." |

**Avoid**: passive voice, jargon, exclamation marks in error states, vague messages like "Something went wrong."

**Prefer**: active voice, specific descriptions of what happened and what to do next.

## Design review process

All user-facing UI changes require a design review before merging to staging.

1. Upload mockups or screenshots to the PR description.
2. Tag Emily Rose as reviewer.
3. For significant changes, also post in **#engineering** with a preview link.
4. Design review SLA: Emily will respond within one business day.

For urgent changes (SEV1 UI fix), Emily can be pinged directly in DM.
`,
    contentJson: [
      image(imageUrls.design, 'Design workspace with color swatches'),
      p('This page is the source of truth for how Serenity looks, feels, and speaks. Owner: Emily Rose (UI/UX Designer). Never hardcode hex values in component files.'),
      h(2, 'Brand identity'),
      p('Name: Serenity. Tagline: "Your whole team, one place." Brand promise: a calm, organized workspace that helps teams communicate clearly and ship faster. What Serenity is: Focused. Reliable. Human.'),
      h(2, 'Color palette'),
      bullet('--brand (#070738) — primary actions, key text. Tailwind: bg-brand, text-brand.'),
      bullet('--brand-surface (#f4f4fb) — page and panel backgrounds. Tailwind: bg-brand-surface.'),
      bullet('--brand-muted (#6b6b9a) — secondary and caption text. Tailwind: text-brand-muted.'),
      bullet('--brand-border (#d0d0e8) — subtle dividers, input borders. Tailwind: border-brand-border.'),
      h(2, 'Typography'),
      bullet('Display (h1): text-3xl font-bold — page titles, hero text.'),
      bullet('Heading 1 (h2): text-2xl font-semibold — section titles.'),
      bullet('Body (p): text-sm — default body text.'),
      bullet('Caption (span): text-xs text-brand-muted — timestamps, metadata.'),
      h(2, 'Component patterns'),
      p('Primary button: bg-brand text-white hover:bg-brand-hover rounded-md. Secondary: border border-brand-border bg-white. Destructive: bg-red-600 text-white.'),
      h(2, 'Voice and tone'),
      bullet('Empty states: helpful, inviting — "No messages yet. Start the conversation."'),
      bullet('Errors: clear, non-blaming — "Couldn\'t save the page. Please try again."'),
      bullet('Success: concise, positive — "Changes saved."'),
      bullet('Avoid passive voice, jargon, and vague messages like "Something went wrong."'),
      h(2, 'Design review process'),
      numbered('Upload mockups or screenshots to the PR description.'),
      numbered('Tag Emily Rose as reviewer.'),
      numbered('For significant changes, post in #engineering with a preview link.'),
      numbered('Design review SLA: Emily responds within one business day.'),
    ],
  },
];
