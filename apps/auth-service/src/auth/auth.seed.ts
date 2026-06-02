import {
  ChatConversationType,
  WorkspaceRole,
  WikiPageVisibility,
  Prisma,
  MailProvider,
  MailAccountStatus,
  CalendarItemType,
  CalendarVisibility,
  CalendarTaskStatus,
  ContactType,
  ContactStatus,
  OfficeRoomType,
} from '@prisma/client';
import { hash } from 'bcryptjs';

export async function seedOrganizationData(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgSlug: string,
  creatorUser: { id: string; displayName: string }
) {
  const passwordHash = await hash('password123', 10);

  // Helper to get or create users to prevent unique constraint failures on email
  const getOrCreateUser = async (email: string, displayName: string) => {
    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          displayName,
          passwordHash,
        },
      });
    }
    return user;
  };

  // 1. Create Workspace Members (Users)
  const alice = await getOrCreateUser(`alice-${orgSlug}@example.com`, 'Alice (Marketing)');
  const bob = await getOrCreateUser(`bob-${orgSlug}@example.com`, 'Bob (Engineering)');
  const david = await getOrCreateUser('david.miller@workspace.com', 'David');
  const mary = await getOrCreateUser('mary@example.com', 'Mary');
  const sarah = await getOrCreateUser('sarah.connor@workspace.com', 'Sarah Connor');
  const alex = await getOrCreateUser('alex.vance@workspace.com', 'Alex Vance');
  const john = await getOrCreateUser('john@example.com', 'John');
  const emily = await getOrCreateUser('emily@example.com', 'Emily');

  // 2. Create Departments
  const engDept = await tx.department.create({
    data: { orgId, name: 'Engineering' },
  });
  const mktDept = await tx.department.create({
    data: { orgId, name: 'Marketing' },
  });
  const desDept = await tx.department.create({
    data: { orgId, name: 'Design' },
  });

  // Helper to add workspace member if not exists
  const addWorkspaceMember = async (userId: string, role: WorkspaceRole, deptId: string | null) => {
    const existing = await tx.workspaceMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!existing) {
      await tx.workspaceMember.create({
        data: {
          orgId,
          userId,
          role,
          departmentId: deptId,
        },
      });
    } else {
      await tx.workspaceMember.update({
        where: { userId_orgId: { userId, orgId } },
        data: { departmentId: deptId },
      });
    }
  };

  // Assign memberships & departments
  await addWorkspaceMember(creatorUser.id, WorkspaceRole.OWNER, engDept.id);
  await addWorkspaceMember(alice.id, WorkspaceRole.MEMBER, mktDept.id);
  await addWorkspaceMember(bob.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(david.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(mary.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(sarah.id, WorkspaceRole.MEMBER, mktDept.id);
  await addWorkspaceMember(alex.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(john.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(emily.id, WorkspaceRole.MEMBER, desDept.id);

  // 3. Create Contacts
  await tx.contact.createMany({
    data: [
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Alice (Marketing)',
        email: alice.email,
        title: 'Marketing Specialist',
        departmentId: mktDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Bob (Engineering)',
        email: bob.email,
        title: 'Software Engineer',
        departmentId: engDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'David',
        email: david.email,
        title: 'Senior Dev',
        departmentId: engDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Mary',
        email: mary.email,
        title: 'QA',
        departmentId: engDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Sarah Connor',
        email: sarah.email,
        title: 'Head of Marketing',
        departmentId: mktDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Alex Vance',
        email: alex.email,
        title: 'Project Lead',
        departmentId: engDept.id,
        notes: 'Lead owner of Serenity',
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'John',
        email: john.email,
        title: 'Software Engineer',
        departmentId: engDept.id,
      },
      {
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: 'Emily',
        email: emily.email,
        title: 'Designer',
        departmentId: desDept.id,
      },
      {
        orgId,
        type: ContactType.GUEST,
        status: ContactStatus.ACTIVE,
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0199',
        company: 'External',
        title: 'Contractor',
      },
    ],
  });

  // 4. Create Public Channels & DMs
  const generalChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'general',
      slug: 'general',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
          { userId: bob.id },
          { userId: david.id },
          { userId: mary.id },
          { userId: sarah.id },
          { userId: alex.id },
          { userId: john.id },
          { userId: emily.id },
        ],
      },
    },
  });

  await tx.chatConversation.create({
    data: {
      orgId,
      name: 'random',
      slug: 'random',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: bob.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
          { userId: bob.id },
          { userId: david.id },
          { userId: mary.id },
          { userId: sarah.id },
          { userId: alex.id },
          { userId: john.id },
          { userId: emily.id },
        ],
      },
    },
  });

  // DM between Creator and Sarah Connor
  const dmSarahIds = [creatorUser.id, sarah.id].sort();
  const dmSarahKey = dmSarahIds.join('_');
  const dmSarahConversation = await tx.chatConversation.create({
    data: {
      orgId,
      type: ChatConversationType.DM,
      dmKey: dmSarahKey,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: sarah.id },
        ],
      },
    },
  });

  // DM between Creator and Alice
  const dmAliceIds = [creatorUser.id, alice.id].sort();
  const dmAliceKey = dmAliceIds.join('_');
  const dmAliceConversation = await tx.chatConversation.create({
    data: {
      orgId,
      type: ChatConversationType.DM,
      dmKey: dmAliceKey,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
        ],
      },
    },
  });

  // 5. Seed messages
  const now = new Date();

  // Welcome messages in general
  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: alice.id,
      content: `Welcome to the team, ${creatorUser.displayName}! Excited to have you here.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
    },
  });

  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: bob.id,
      content: `Welcome ${creatorUser.displayName}! Let me know if you need help setting up your dev environment.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 1.9),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 1.9),
    },
  });

  // Sprint Planning details in general (matches Workspace QA case 9)
  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: mary.id,
      content: `In the latest sprint planning meeting, the team agreed to focus on the evaluation module and set the release date to Friday.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 1),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 1),
    },
  });

  // Key Results message in general (matches Workspace QA case 8)
  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: alex.id,
      content: `Here are the messages mentioning key results: we must establish stable evaluation score bounds by Friday.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 30),
    },
  });

  // DM conversations with Sarah Connor (matches Workspace QA case 17)
  await tx.chatMessage.create({
    data: {
      conversationId: dmSarahConversation.id,
      authorId: sarah.id,
      content: `Are you available for a meeting?`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 10),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 10),
    },
  });

  await tx.chatMessage.create({
    data: {
      conversationId: dmSarahConversation.id,
      authorId: creatorUser.id,
      content: `Yes, 2 PM works for me.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 9),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 9),
    },
  });

  // DM with Alice
  await tx.chatMessage.create({
    data: {
      conversationId: dmAliceConversation.id,
      authorId: alice.id,
      content: `Hey ${creatorUser.displayName}! Did you have a chance to look at the new marketing copy for the landing page?`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 5),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 5),
    },
  });

  // 6. Create Office Rooms
  const roomA = await tx.officeRoom.create({
    data: { orgId, name: 'Room A', type: OfficeRoomType.OPEN, createdById: creatorUser.id },
  });
  const roomB = await tx.officeRoom.create({
    data: { orgId, name: 'Room B', type: OfficeRoomType.FOCUS, createdById: creatorUser.id },
  });
  const mainHall = await tx.officeRoom.create({
    data: { orgId, name: 'Main Hall', type: OfficeRoomType.OPEN, createdById: creatorUser.id },
  });
  const mainConferenceRoom = await tx.officeRoom.create({
    data: { orgId, name: 'Main Conference Room', type: OfficeRoomType.OPEN, createdById: creatorUser.id },
  });

  // 7. Seed Wiki Pages (Aligned with Wiki Editor Cases & Workspace QA)
  const wikiPagesToCreate = [
    {
      title: 'Welcome to Serenity Workspace 🚀',
      icon: 'sparkles',
      contentMarkdown: `# Welcome to Serenity Workspace!

Serenity is your team's central hub for collaboration. Everything you need is in one place:

- **Chat** — Real-time messaging in channels or direct messages.
- **Wiki** — Shared knowledge base for documentation and processes.
- **Calendar** — Schedule meetings, book rooms, and manage tasks.
- **Office** — Virtual rooms for audio and video huddles.

## Getting Around

| Section | What it's for |
|---|---|
| Chat | Day-to-day team communication |
| Wiki | Policies, guides, and documentation |
| Calendar | Meetings, room bookings, task tracking |
| Office | Live audio/video collaboration |

## AI Assistant ✨

Type \`/\` in any chat box or wiki editor to invoke the Serenity AI assistant.
It can search the workspace, draft messages, edit wiki pages, schedule meetings, and create tasks — all from natural language.
`,
    },
    {
      title: 'Code Styling and Linting Guidelines',
      icon: 'code',
      contentMarkdown: `# Code Styling and Linting Guidelines

> Last updated by David.

## Tooling

We use **ESLint** and **Prettier** across all repositories to enforce consistent code formatting.

## Formatting Rules

- **Indentation:** 2 spaces (no tabs).
- **Quotes:** Double quotes for strings.
- **Semicolons:** Required at end of statements.
- **Trailing commas:** Required in multi-line objects and arrays.
- **Line length:** Max 100 characters.

## Running the Linter

\`\`\`bash
pnpm lint          # check for issues
pnpm lint:fix      # auto-fix where possible
\`\`\`

## Pre-commit Hook

Husky runs ESLint and Prettier automatically before every commit. Do not bypass hooks with \`--no-verify\`.
`,
    },
    {
      title: 'Workspace Security Policy and Best Practices',
      icon: 'shield',
      contentMarkdown: `# Workspace Security Policy and Best Practices

> Under Guidelines category.

## Password Policy

- Use a strong, unique password for your workspace account.
- Never share credentials with teammates — use role-based access instead.
- Enable two-factor authentication (2FA) where available.

## Server & Infrastructure

- Ensure all servers are updated with the latest security patches on a monthly schedule.
- Rotate API keys and service tokens every 90 days.
- Never commit secrets, API keys, or tokens to version control.

## Access Control

- Follow the principle of least privilege — request only the permissions you need.
- Revoke access for team members who leave the organisation within 24 hours.

## Reporting

Report suspected security incidents to the workspace admin immediately via a direct message.
`,
    },
    {
      title: 'Remote Working Guidelines',
      icon: 'home',
      contentMarkdown: `# Remote Working Guidelines

Remote work is fully supported. Follow these guidelines to stay connected and productive.

## Daily Routine

- **Daily standup:** 10:00 AM via the Office virtual room — attendance is expected.
- Keep your status updated in the workspace so teammates know your availability.

## Communication

- Respond to direct messages within 2 hours during working hours.
- Use the **general** channel for team-wide announcements.
- Prefer async updates in the wiki or chat over unnecessary meetings.

## Time Tracking

- Timesheets are due every Friday by 5:00 PM.
- Log time against the relevant project or task in the Calendar.

## Equipment & Security

- Use a secure, private network when accessing workspace systems.
- Lock your screen when away from your workstation.
`,
    },
    {
      title: 'Team Standards',
      icon: 'users',
      contentMarkdown: `# Team Standards

These standards apply to everyone on the Serenity team.

## Communication

- Be respectful and constructive in all feedback.
- Communicate blockers and changes early — don't wait for the standup.
- Keep discussions in public channels so the whole team has visibility.

## Code Quality

- Document your code — aim for self-explanatory naming before adding comments.
- Write tests for new features and bug fixes.
- No PR is too small to review; no PR is too large to split.

## Meetings

- Come prepared with an agenda or update.
- Start and end on time.
- Record key decisions and action items in the wiki or a task.

## Knowledge Sharing

- When you learn something useful, document it in the wiki.
- Onboard new teammates — pair with them in the first week.
`,
    },
    {
      title: 'Changelog',
      icon: 'list',
      contentMarkdown: `# Changelog

## v1.2.0 — 2026-05-20

### New Features
- Added evaluation metrics dashboard for AI feature monitoring.
- Introduced G-Eval integration for LLM response quality scoring.

### Bug Fixes
- Resolved database connection pool leaks under high load.
- Fixed a race condition in the real-time notification delivery pipeline.

### Improvements
- Reduced AI response latency by 30% through prompt caching.
- Improved wiki search indexing to include page content snippets.

---

## v1.1.0 — 2026-04-10

### New Features
- Wiki editor AI assistant: rewrite, translate, and summarise pages with a single prompt.
- Room booking via the AI calendar agent.

### Bug Fixes
- Fixed auth token expiry not being handled gracefully on the frontend.
`,
    },
    {
      title: 'Setup Guide',
      icon: 'book',
      contentMarkdown: `# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/serenity.git
cd serenity

# Install all dependencies from the monorepo root
pnpm install
\`\`\`

## Environment Variables

Copy the example env files and fill in your values:

\`\`\`bash
cp apps/core-service/.env.example apps/core-service/.env
cp apps/auth-service/.env.example apps/auth-service/.env
\`\`\`

## Running the Dev Environment

\`\`\`bash
# Start infrastructure (Postgres, Redis)
docker compose up -d postgres redis

# Run all services in development mode
pnpm nx run-many --target=dev --all
\`\`\`

The web app is available at **http://localhost:9999**.
`,
    },
    {
      title: 'Onboarding',
      icon: 'user-plus',
      contentMarkdown: `# Onboarding Guide

Welcome to the team! Complete the steps below to get up and running in your first week.

## Day 1

- [ ] Accept your workspace invitation and set up your profile.
- [ ] Read the Team Standards and Remote Working Guidelines wiki pages.
- [ ] Join the **#general** and **#random** channels.
- [ ] Introduce yourself in **#general**.

## First Week

- [ ] Follow the Setup Guide to get the dev environment running locally.
- [ ] Pair with a team member to walk through the codebase.
- [ ] Complete your first task — your onboarding buddy will assign one.
- [ ] Attend the weekly standup on Monday at 9:00 AM.

## Access & Accounts

Contact the workspace admin to request access to:
- GitHub organisation
- Cloud infrastructure dashboards
- Any project-specific credentials

## Questions?

Ask in **#general** or DM your onboarding buddy directly.
`,
    },
    {
      title: 'Goals Draft',
      icon: 'target',
      contentMarkdown: `# Q3 2026 Goals — Draft

> Status: In progress. Owners to review and confirm by June 15.

## Engineering

- Ship evaluation service v1.0 with full G-Eval coverage.
- Achieve 95% uptime across all production services.

## Product

- Onboard 3 new pilot organisations to the Serenity platform.
- Launch the mobile-optimised web experience.

## Team

- Complete onboarding documentation for all core workflows.
- Run at least one internal demo day per month.
`,
    },
    {
      title: 'Developer Manual',
      icon: 'file-text',
      contentMarkdown: `# Developer Manual

## Prerequisites

Before contributing, ensure you have read:
- Setup Guide
- Code Styling and Linting Guidelines
- Code Review Policy

## Project Structure

Serenity is an Nx monorepo. Key apps:

| App | Description |
|---|---|
| \`apps/web\` | Next.js 16 frontend (port 9999) |
| \`apps/core-service\` | Main REST API (NestJS) |
| \`apps/auth-service\` | Authentication and organisation setup |
| \`apps/realtime-service\` | WebSocket event bus |
| \`apps/evaluation-service\` | AI evaluation pipeline (Python) |

## Common Commands

\`\`\`bash
pnpm nx dev @org/web          # Start the frontend
pnpm nx build core-service    # Build a specific service
pnpm nx test core-service     # Run tests
pnpm nx lint auth-service     # Lint a service
\`\`\`

## Branch Strategy

- \`main\` — production-ready code, protected branch.
- \`feat/<name>\` — feature branches; open a PR to merge into main.
`,
    },
    {
      title: 'Release Procedures',
      icon: 'rocket',
      contentMarkdown: `# Release Procedures

Follow these steps for every production release.

## Pre-release Checklist

- [ ] All feature PRs merged and CI passing on \`main\`.
- [ ] Version bumped in \`package.json\` following semver.
- [ ] Changelog updated with new features and bug fixes.
- [ ] QA sign-off obtained from Mary.

## Release Steps

1. Create a release branch: \`git checkout -b release/vX.Y.Z\`
2. Run the full test suite: \`pnpm nx run-many --target=test --all\`
3. Build all production artefacts: \`pnpm nx run-many --target=build --all\`
4. Push the Docker images to the registry.
5. Deploy via: \`docker stack deploy --compose-file docker-compose.prod.yml serenity\`
6. Smoke-test the production environment.
7. Merge the release branch into \`main\` and tag the commit.

## Rollback

If a critical issue is found post-deploy, redeploy the previous Docker image tag immediately and open a post-mortem task.
`,
    },
    {
      title: 'API Guidelines',
      icon: 'cpu',
      contentMarkdown: `# API Guidelines

## Design Principles

- All APIs are RESTful and return JSON.
- Use consistent HTTP verbs: \`GET\` (read), \`POST\` (create), \`PATCH\` (partial update), \`DELETE\` (remove).
- All endpoints are versioned under \`/api/v1/\`.

## Authentication

Internal service-to-service calls use the \`x-internal-api-token\` header.
Client-facing endpoints require a JWT Bearer token in the \`Authorization\` header.

## Response Format

\`\`\`json
{
  "data": { ... },
  "error": null
}
\`\`\`

Errors return a non-2xx status with \`"error": { "code": "...", "message": "..." }\`.

## Rate Limiting

Public endpoints are rate-limited to **100 requests per minute** per user.
Internal endpoints have no rate limit but must pass the internal API token.
`,
    },
    {
      title: 'Maintenance Draft',
      icon: 'wrench',
      contentMarkdown: `# Maintenance Notes — Draft

> These are rough notes. To be formalised into a proper maintenance runbook.

## Pending Actions

- We need to ensure all servers are updated with the latest security patches (overdue since April).
- Rotate the Redis auth token — current one has been active for 6 months.
- Clean up stale Docker volumes on the staging server.
- Archive evaluation run data older than 90 days from the database.

## Recurring Tasks (monthly)

- Review and rotate API keys.
- Verify database backup integrity.
- Check SSL certificate expiry dates.
`,
    },
    {
      title: 'Deployment Instructions',
      icon: 'server',
      contentMarkdown: `# Deployment Instructions

## Build

\`\`\`bash
# Build all services
pnpm nx run-many --target=build --all

# Build a single service
pnpm nx build core-service
\`\`\`

## Docker

\`\`\`bash
# Build Docker images
docker compose -f docker-compose.prod.yml build

# Push images to registry
docker compose -f docker-compose.prod.yml push
\`\`\`

## Deploy

\`\`\`bash
# Deploy the full stack
docker stack deploy --compose-file docker-compose.prod.yml serenity

# Restart a single service
docker service update --force serenity_core-service
\`\`\`

## Verify

After deployment, confirm all services are healthy:

\`\`\`bash
docker service ls
curl https://your-domain.com/api/health
\`\`\`
`,
    },
    {
      title: 'Code Review Policy',
      icon: 'clipboard-list',
      contentMarkdown: `# Code Review Policy

Every code change must be reviewed by at least one other team member before merging.

## Review Checklist

- [ ] Code compiles and all tests pass.
- [ ] Logic is correct and edge cases are handled.
- [ ] No hardcoded secrets, credentials, or environment-specific values.
- [ ] Follows the Code Styling and Linting Guidelines.
- [ ] New functionality is covered by tests.
- [ ] Documentation or wiki updated if the change affects behaviour.

## Reviewer Responsibilities

- Aim to review PRs within one business day.
- Leave constructive comments — suggest improvements, don't just point out problems.
- Approve only when you are confident the change is safe to ship.

## Author Responsibilities

- Keep PRs small and focused on a single concern.
- Write a clear PR description explaining the what and why.
- Respond to all reviewer comments before requesting re-review.
`,
    },
    {
      title: 'Security Guidelines',
      icon: 'lock',
      contentMarkdown: `# Security Guidelines

## Credentials

- Never commit raw API keys, passwords, or tokens to version control.
- Use environment variables or a secrets manager for all sensitive values.
- Keep passwords secure and unique per service — never reuse credentials.

## Dependencies

- Run \`pnpm audit\` regularly and resolve high-severity vulnerabilities promptly.
- Pin dependency versions in production to avoid unexpected upgrades.

## Network

- All external traffic must use HTTPS.
- Internal service-to-service communication must use the internal API token header.
- Restrict inbound firewall rules to only required ports.

## Incident Response

If a security incident is suspected:
1. Immediately rotate the affected credentials.
2. Notify the workspace admin.
3. Document the incident and remediation steps in the wiki.
`,
    },
    {
      title: 'Milestones',
      icon: 'calendar',
      contentMarkdown: `# Project Milestones

| Milestone | Due Date | Owner | Status |
|---|---|---|---|
| Kickoff | June 1, 2026 | Huy | ✅ Completed |
| Alpha release | June 20, 2026 | Alex Vance | In progress |
| Demo Day | July 15, 2026 | David | Upcoming |
| Beta launch | August 1, 2026 | Alex Vance | Planned |

## Notes

- **Kickoff (June 1):** Initial scope locked, team onboarded, infrastructure provisioned.
- **Alpha release (June 20):** Core features stable, internal team testing.
- **Demo Day (July 15):** Showcase to stakeholders and pilot organisations. David leads the demo.
- **Beta launch (August 1):** External pilot organisations onboarded.
`,
    },
    {
      title: 'Getting Started',
      icon: 'play',
      contentMarkdown: `# Getting Started

## Step 1: Start the Dev Server

\`\`\`bash
pnpm nx dev @org/web
\`\`\`

The app will be available at **http://localhost:9999**.

## Step 2: Log In

Use any seeded account to log in during development:
- Email: \`david.miller@workspace.com\` / Password: \`password123\`
- Email: \`sarah.connor@workspace.com\` / Password: \`password123\`

## Step 3: Explore the Workspace

- Browse channels in **Chat**.
- Search and edit pages in **Wiki**.
- View your calendar and book rooms in **Calendar**.
- Try the AI assistant by typing \`/\` in any input.

## Need Help?

See the Developer Manual for architecture details, or ask in the **#general** channel.
`,
    },
    {
      title: 'Troubleshooting Guide',
      icon: 'alert-triangle',
      contentMarkdown: `# Troubleshooting Guide

Use this guide when diagnosing issues in development or production.

## Step 1: Check the Logs

\`\`\`bash
# Docker service logs
docker service logs serenity_core-service --tail 100

# Local dev logs
pnpm nx dev core-service
\`\`\`

Look for \`ERROR\` or \`WARN\` entries near the time the issue occurred.

## Step 2: Verify Database Credentials

Ensure the \`DATABASE_URL\` in your \`.env\` file is correct and the database is reachable:

\`\`\`bash
psql "$DATABASE_URL" -c "SELECT 1"
\`\`\`

## Step 3: Restart the Redis Instance

Many caching and real-time issues resolve after a Redis restart:

\`\`\`bash
docker compose restart redis
\`\`\`

## Step 4: Rebuild and Redeploy

If the above steps don't resolve the issue, do a clean rebuild:

\`\`\`bash
pnpm nx reset
pnpm nx build core-service
\`\`\`
`,
    },
    {
      title: 'Notification Engine',
      icon: 'bell',
      contentMarkdown: `# Notification Engine

The notification engine delivers real-time alerts to users via multiple channels.

## Delivery Channels

- **In-app:** Instant badge and toast notifications via WebSocket.
- **Email:** Transactional emails via the configured SMTP provider.

## How It Works

1. A trigger event is emitted (e.g. a new message, task assigned, meeting reminder).
2. The event is published to the Redis pub/sub channel.
3. The realtime-service subscribes and pushes the notification to connected clients.
4. For offline users, the event is queued and delivered as an email.

## Configuration

Notification preferences are set per user in Workspace Settings → Notifications.
Admins can configure the global SMTP settings in the organisation admin panel.
`,
    },
    {
      title: 'Architecture Overview',
      icon: 'layers',
      contentMarkdown: `# Architecture Overview

Serenity is a microservices platform built on an Nx monorepo.

## Services

| Service | Tech | Responsibility |
|---|---|---|
| \`web\` | Next.js 16, React 19 | Frontend application |
| \`gateway\` | NestJS | API gateway, request routing |
| \`auth-service\` | NestJS | Authentication, JWT, organisation setup |
| \`core-service\` | NestJS | Chat, wiki, calendar, contacts, tasks |
| \`realtime-service\` | NestJS + WebSocket | Real-time event delivery |
| \`evaluation-service\` | Python, FastAPI | AI feature evaluation pipeline |

## Data Flow

\`\`\`
Browser → gateway → core-service / auth-service
                 ↘ realtime-service (WebSocket)
                 ↘ AI service (internal HTTP)
\`\`\`

## Infrastructure

- **Database:** PostgreSQL (via Prisma ORM)
- **Cache & Pub/Sub:** Redis
- **AI:** Claude (Anthropic) with tool use for agentic features
- **Search:** Vector embeddings stored in PostgreSQL (pgvector)
`,
    },
    {
      title: 'Webhook Processing',
      icon: 'activity',
      contentMarkdown: `# Webhook Processing

Serenity processes incoming webhooks asynchronously using a Redis-backed message queue.

## Flow

1. An external service sends a \`POST\` request to \`/api/v1/webhooks/:provider\`.
2. The gateway validates the request signature and enqueues the payload in Redis.
3. A background worker dequeues and processes each event.
4. The result is persisted to the database and, where applicable, triggers a real-time notification.

## Supported Providers

- **Google Calendar** — sync external calendar events.
- **Email webhooks** — inbound email processing.

## Error Handling

Failed webhook events are retried up to 3 times with exponential backoff. After 3 failures, the event is moved to a dead-letter queue for manual inspection.
`,
    },
    {
      title: 'Guidelines Summary',
      icon: 'check-square',
      contentMarkdown: `# Guidelines Summary

A quick reference for the key team guidelines. See individual pages for full details.

## Daily Expectations

- Attend the **daily standup at 10:00 AM** — this is mandatory.
- Keep your status and tasks up to date in the Calendar.

## Development

- Open a pull request for every change — no direct commits to \`main\`.
- Get at least one approval before merging.
- Write tests for new features and bug fixes.

## Documentation

- Write docs when you change behaviour — update the relevant wiki page.
- If a process isn't documented anywhere, document it now.

## Communication

- Default to public channels over DMs for work discussions.
- Communicate blockers early — don't wait until the standup.

> For the complete guidelines, see: Team Standards, Code Styling Guidelines, Remote Working Guidelines, Security Guidelines.
`,
    },
  ];

  const createdWikiPages: Array<{ id: string; title: string; contentMarkdown: string; contentJson: any }> = [];

  for (const page of wikiPagesToCreate) {
    // Generate simple contentJson matching the markdown
    const jsonContent = [
      {
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: page.title, styles: {} }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: page.contentMarkdown.substring(0, 300), styles: {} }],
      },
    ];

    const createdPage = await tx.wikiPage.create({
      data: {
        orgId,
        createdById: creatorUser.id,
        title: page.title,
        icon: page.icon,
        visibility: WikiPageVisibility.WORKSPACE,
        contentMarkdown: page.contentMarkdown,
        contentJson: jsonContent as Prisma.InputJsonValue,
      },
    });

    createdWikiPages.push({
      id: createdPage.id,
      title: createdPage.title,
      contentMarkdown: createdPage.contentMarkdown,
      contentJson: createdPage.contentJson,
    });
  }

  // 8. Create Calendar Events (Meetings)
  const tomorrow = new Date(now.getTime() + 1000 * 60 * 60 * 24);
  const nextMonday = new Date();
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  nextMonday.setHours(9, 0, 0, 0);

  const nextTuesday = new Date(nextMonday.getTime() + 1000 * 60 * 60 * 24);
  nextTuesday.setHours(10, 0, 0, 0);

  const nextWednesday = new Date(nextTuesday.getTime() + 1000 * 60 * 60 * 24);
  nextWednesday.setHours(9, 0, 0, 0);

  const nextThursday = new Date(nextWednesday.getTime() + 1000 * 60 * 60 * 24);

  // Daily Standup (today/tomorrow at 10 AM)
  const standupStart = new Date(now);
  standupStart.setHours(10, 0, 0, 0);
  const standupEnd = new Date(standupStart.getTime() + 1000 * 60 * 30);

  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.COMPANY,
      title: 'Daily Standup',
      descriptionMarkdown: 'Daily team sync',
      startAt: standupStart,
      endAt: standupEnd,
      attendees: {
        create: [
          { userId: creatorUser.id },
          { userId: bob.id },
          { userId: david.id },
          { userId: mary.id },
        ],
      },
    },
  });

  // Design Review (this Friday afternoon, e.g. 3 PM)
  const friday = new Date();
  friday.setDate(now.getDate() + (5 - now.getDay()));
  friday.setHours(15, 0, 0, 0);
  const fridayEnd = new Date(friday.getTime() + 1000 * 60 * 60 * 1.5);

  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.COMPANY,
      title: 'Design Review',
      descriptionMarkdown: 'Reviewing the Huly replication UI layouts and design standard tokens.',
      startAt: friday,
      endAt: fridayEnd,
      attendees: {
        create: [
          { userId: creatorUser.id },
          { userId: emily.id },
        ],
      },
    },
  });

  // Weekly Standup (every Monday at 9 AM)
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.COMPANY,
      title: 'Weekly Standup',
      descriptionMarkdown: 'General weekly standup with the entire Serenity workspace team.',
      startAt: nextMonday,
      endAt: new Date(nextMonday.getTime() + 1000 * 60 * 60),
      attendees: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
          { userId: bob.id },
          { userId: david.id },
          { userId: mary.id },
          { userId: sarah.id },
          { userId: alex.id },
        ],
      },
    },
  });

  // Arrange call with client next Tuesday at 10am
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.COMPANY,
      title: 'Call with client',
      descriptionMarkdown: 'Client update sync and API token walkthrough.',
      startAt: nextTuesday,
      endAt: new Date(nextTuesday.getTime() + 1000 * 60 * 60),
    },
  });

  // Coffee chat with Emily next Monday at 3 PM
  const coffeeStart = new Date(nextMonday);
  coffeeStart.setHours(15, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.PERSONAL,
      title: 'Coffee chat with Emily',
      descriptionMarkdown: 'Quick catchup',
      startAt: coffeeStart,
      endAt: new Date(coffeeStart.getTime() + 1000 * 60 * 30),
      attendees: {
        create: [{ userId: emily.id }, { userId: creatorUser.id }],
      },
    },
  });

  // Sprint Planning session next week (sprint planning meeting summary details)
  const planningStart = new Date(nextMonday);
  planningStart.setHours(11, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.MEETING,
      visibility: CalendarVisibility.COMPANY,
      title: 'Sprint planning session',
      descriptionMarkdown: 'Discussed evaluation module, assigned task to Huy, target deadline set to Friday.',
      startAt: planningStart,
      endAt: new Date(planningStart.getTime() + 1000 * 60 * 60 * 1.5),
      attendees: {
        create: [{ userId: john.id }, { userId: mary.id }, { userId: creatorUser.id }],
      },
    },
  });

  // Room A booking tomorrow from 10 AM to 11:30 AM
  const roomAStart = new Date(tomorrow);
  roomAStart.setHours(10, 0, 0, 0);
  const roomAEnd = new Date(roomAStart.getTime() + 1000 * 60 * 90);
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.EVENT,
      visibility: CalendarVisibility.COMPANY,
      title: 'Room A Session',
      roomId: roomA.id,
      startAt: roomAStart,
      endAt: roomAEnd,
    },
  });

  // Room B booking next Monday from 2 PM to 4 PM
  const roomBStart = new Date(nextMonday);
  roomBStart.setHours(14, 0, 0, 0);
  const roomBEnd = new Date(roomBStart.getTime() + 1000 * 60 * 120);
  await tx.calendarItem.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      type: CalendarItemType.EVENT,
      visibility: CalendarVisibility.COMPANY,
      title: 'Room B Brainstorm',
      roomId: roomB.id,
      startAt: roomBStart,
      endAt: roomBEnd,
    },
  });

  // 9. Seed Tasks (CalendarItem of type TASK)
  const taskDueDate = new Date(friday);
  taskDueDate.setHours(17, 0, 0, 0);

  const tasksData = [
    { title: 'Implement G-Eval', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Fix CORS issues', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Create seed data', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Review Q3 report', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Fix login bug', createdById: john.id, dueDate: tomorrow },
    { title: 'Send invoice to client', createdById: creatorUser.id, dueDate: nextMonday },
    { title: 'Update API documentation', createdById: creatorUser.id, dueDate: null },
    { title: 'Code review for new feature', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Draft the press release', createdById: creatorUser.id, dueDate: null },
    { title: 'Update onboarding guide', createdById: mary.id, dueDate: null },
    { title: 'Buy groceries', createdById: creatorUser.id, dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 2) }, // tonight
    { title: 'Investigate server crash', createdById: creatorUser.id, dueDate: null },
    { title: 'Follow up with design team', createdById: creatorUser.id, dueDate: nextThursday },
    { title: 'Prepare presentation for board meeting', createdById: creatorUser.id, dueDate: tomorrow },
    { title: 'Write unit tests for core service', createdById: sarah.id, dueDate: null },
    { title: 'Call the landlord', createdById: creatorUser.id, dueDate: tomorrow },
    { title: 'Submit timesheet', createdById: creatorUser.id, dueDate: now },
    { title: 'Schedule interview with candidate Alex', createdById: creatorUser.id, dueDate: null },
    { title: 'Check database backups', createdById: creatorUser.id, dueDate: nextSunday(now) },
    { title: 'Fix layout bug on homepage', createdById: david.id, dueDate: null },
    { title: 'Renew domain registration', createdById: creatorUser.id, dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 15) },
    { title: 'Send status report to manager', createdById: creatorUser.id, dueDate: taskDueDate },
    { title: 'Clean up old docker volumes', createdById: creatorUser.id, dueDate: null },
  ];

  for (const t of tasksData) {
    await tx.calendarItem.create({
      data: {
        orgId,
        createdById: t.createdById,
        type: CalendarItemType.TASK,
        visibility: CalendarVisibility.PERSONAL,
        title: t.title,
        taskStatus: CalendarTaskStatus.TODO,
        dueDate: t.dueDate,
      },
    });
  }


  // 11. Seed Document File (matches Workspace QA case 16)
  await tx.documentFile.create({
    data: {
      orgId,
      fileId: `file-q3-budget-${orgSlug}`,
      title: 'Q3_Budget_Draft.pdf',
      mimeType: 'application/pdf',
      chunksCount: 1,
    },
  });

  return {
    wikiPages: createdWikiPages,
  };
}

function nextSunday(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  result.setHours(23, 59, 59, 999);
  return result;
}
