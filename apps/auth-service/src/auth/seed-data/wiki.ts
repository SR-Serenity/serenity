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
  {
    title: 'New Teammate Onboarding',
    icon: 'user-plus',
    coverColor: '#2563EB',
    contentMarkdown: `# New Teammate Onboarding

![Team onboarding workshop](${imageUrls.onboarding})

This page is the single onboarding guide for a new Serenity teammate. The goal is simple: by the end of the first week, the teammate should understand how the team communicates, how to run the product locally, where core knowledge lives, and what first contribution they can safely own.

## What success looks like

A teammate is considered onboarded when they can:

- Log in to the workspace and find the core team channels.
- Run the local development stack.
- Explain which service owns authentication, core product APIs, realtime events, and AI workflows.
- Pick up a small task, ask clear questions, and open a reviewable pull request.
- Update the wiki when they learn something that future teammates will need.

## Day 1: workspace setup

Start with account and context. Do not begin with code until the teammate can navigate the workspace.

- Accept the workspace invitation and update the profile display name.
- Join **general** and **random**.
- Read this page, Engineering Delivery Guide, and Incident Response Runbook.
- Confirm the teammate has an onboarding buddy.
- Confirm department assignment in Settings.
- Ask the buddy for the current sprint goal and the safest starter task.

## Day 2: local environment

The teammate should run the product locally before changing application behavior.

\`\`\`bash
pnpm install
pnpm prisma:generate
docker compose up -d postgres redis
pnpm nx serve auth-service
pnpm nx serve core-service
pnpm nx serve gateway
pnpm nx dev web
\`\`\`

If the setup fails, capture the command, error output, operating system, Node version, and whether Docker containers are healthy. Add the finding to this page only if it would help the next teammate.

## Day 3: product walkthrough

The onboarding buddy should walk through the product in this order:

1. Login and organization selection.
2. Chat channels and direct messages.
3. Wiki search and page editing.
4. Calendar meetings, tasks, and room booking.
5. Office rooms.
6. AI assistant behavior and source references.

The walkthrough should focus on real workflows rather than feature lists. A good walkthrough answers: "What job is this screen doing for the user?"

## First contribution

The first task should be small, observable, and easy to verify. Good examples include improving empty state copy, adding a focused validation test, fixing a broken seed page, or documenting a known setup issue.

Before opening the pull request, the teammate should write:

- What changed.
- Why it changed.
- How it was verified.
- Any follow-up work that was intentionally left out.

## Buddy checklist

- [ ] Workspace access confirmed.
- [ ] Local development stack running.
- [ ] Product walkthrough completed.
- [ ] First task selected.
- [ ] First pull request opened.
- [ ] Notes from onboarding added to the wiki.
`,
    contentJson: [
      image(imageUrls.onboarding, 'Team onboarding workshop'),
      p(
        'This page is the single onboarding guide for a new Serenity teammate. By the end of the first week, the teammate should understand communication, local setup, core service ownership, and their first safe contribution.',
      ),
      h(2, 'What success looks like'),
      bullet('Log in to the workspace and find the core team channels.'),
      bullet('Run the local development stack.'),
      bullet('Explain which service owns authentication, core APIs, realtime events, and AI workflows.'),
      bullet('Pick up a small task, ask clear questions, and open a reviewable pull request.'),
      h(2, 'Day 1: workspace setup'),
      bullet('Accept the workspace invitation and update the profile display name.'),
      bullet('Join general and random.'),
      bullet('Read this page, Engineering Delivery Guide, and Incident Response Runbook.'),
      bullet('Confirm the teammate has an onboarding buddy and department assignment.'),
      h(2, 'Day 2: local environment'),
      p('Run install, Prisma generation, local infrastructure, and the main services before changing behavior.'),
      h(2, 'First contribution'),
      p(
        'The first task should be small, observable, and easy to verify. The pull request should explain what changed, why it changed, and how it was checked.',
      ),
      h(2, 'Buddy checklist'),
      checklist('Workspace access confirmed'),
      checklist('Local development stack running'),
      checklist('Product walkthrough completed'),
      checklist('First task selected'),
      checklist('First pull request opened'),
    ],
  },
  {
    title: 'Engineering Delivery Guide',
    icon: 'code',
    coverColor: '#0F766E',
    contentMarkdown: `# Engineering Delivery Guide

![Engineering team planning work](${imageUrls.delivery})

This guide explains how engineering work moves from an idea to a shipped change. It is intentionally practical: follow it when implementing features, fixing bugs, or changing service behavior.

## Delivery principles

- Prefer small changes with clear ownership.
- Keep behavior, tests, and documentation in the same pull request when they belong together.
- Use the existing architecture before adding new abstractions.
- Make failure states visible and understandable.
- Verify through Nx tasks, not direct framework commands, unless there is a clear reason.

## Before writing code

Read the surrounding code first. Identify the service boundary, existing DTOs, state stores, and tests. If the change crosses web, gateway, and core-service, write down the data flow before editing.

For user-facing changes, confirm:

- Which user role can perform the action.
- Which organization owns the data.
- What the empty, loading, error, and success states should show.
- Whether realtime or AI indexing needs to react to the change.

## Implementation workflow

1. Start with the smallest vertical path that proves the behavior.
2. Keep naming consistent with nearby modules.
3. Add validation at service boundaries.
4. Update DTOs and client types together.
5. Add tests around behavior, not implementation details.
6. Run the relevant Nx target before asking for review.

Example verification commands:

\`\`\`bash
pnpm nx test auth-service
pnpm nx build auth-service
pnpm nx test core-service
pnpm nx build web
\`\`\`

## Pull request standard

A good pull request should be reviewable in one sitting. If it changes too many concerns, split it before review.

The PR description must include:

- Problem: what was broken or missing.
- Solution: what changed.
- Verification: commands run and manual checks.
- Risk: migrations, auth changes, background jobs, or user-visible behavior.

## Review checklist

- Authorization checks match organization membership.
- Database writes use the correct owner and relation fields.
- Errors are explicit enough for users and operators.
- Tests cover the behavior that could regress.
- The wiki or README was updated if future teammates need the knowledge.

## Done means shipped knowledge

If the change teaches the team something new, update the wiki. Chat messages are useful for discussion, but the wiki is where durable decisions belong.
`,
    contentJson: [
      image(imageUrls.delivery, 'Engineering team planning work'),
      p(
        'This guide explains how engineering work moves from an idea to a shipped change. Follow it when implementing features, fixing bugs, or changing service behavior.',
      ),
      h(2, 'Delivery principles'),
      bullet('Prefer small changes with clear ownership.'),
      bullet('Keep behavior, tests, and documentation together when they belong together.'),
      bullet('Use the existing architecture before adding new abstractions.'),
      bullet('Verify through Nx tasks.'),
      h(2, 'Before writing code'),
      p(
        'Read the surrounding code first. Identify the service boundary, existing DTOs, state stores, and tests. If the change crosses web, gateway, and core-service, write down the data flow before editing.',
      ),
      h(2, 'Implementation workflow'),
      bullet('Start with the smallest vertical path that proves the behavior.'),
      bullet('Keep naming consistent with nearby modules.'),
      bullet('Add validation at service boundaries.'),
      bullet('Update DTOs and client types together.'),
      bullet('Add tests around behavior, not implementation details.'),
      h(2, 'Pull request standard'),
      p('The PR description must include problem, solution, verification, and risk.'),
      h(2, 'Review checklist'),
      checklist('Authorization checks match organization membership'),
      checklist('Database writes use the correct owner and relation fields'),
      checklist('Errors are explicit enough for users and operators'),
      checklist('Tests cover behavior that could regress'),
    ],
  },
  {
    title: 'Incident Response Runbook',
    icon: 'shield',
    coverColor: '#DC2626',
    contentMarkdown: `# Incident Response Runbook

![Operations room during incident response](${imageUrls.incident})

Use this runbook when a production or staging issue affects users, data integrity, security, or critical development workflows. The goal is to restore service safely, communicate clearly, and leave behind a useful record.

## Severity levels

| Severity | Meaning | Example |
|---|---|---|
| SEV1 | Critical user impact or data risk | Login unavailable, data leak, destructive migration |
| SEV2 | Major workflow degraded | Wiki save failures, calendar unavailable, chat delivery delayed |
| SEV3 | Limited impact or workaround exists | One integration failing, non-critical background job delayed |

## First 10 minutes

- Name an incident lead.
- Create a dedicated chat thread or channel.
- Write the current impact in one sentence.
- Stop risky deployments until the incident lead clears them.
- Collect the first logs, recent deploys, and affected services.

## Triage questions

Ask these before making changes:

- Is the issue still happening?
- Which users or organizations are affected?
- Did this start after a deploy, migration, config change, or dependency update?
- Is there a safe rollback path?
- Could the fix make data integrity worse?

## Common checks

\`\`\`bash
pnpm nx build core-service
pnpm nx test core-service
docker compose logs postgres --tail=100
docker compose logs redis --tail=100
curl http://localhost:3000/health
\`\`\`

Use service-specific logs for the suspected owner. If the issue involves wiki search or AI answers, check whether the wiki indexing call succeeded after the page changed.

## Communication template

Post updates in this format:

> Status: investigating, mitigating, monitoring, or resolved.
> Impact: who is affected and what they cannot do.
> Action: what is being done now.
> Next update: exact time for the next update.

## Resolution checklist

- [ ] User impact has stopped.
- [ ] Data integrity has been checked.
- [ ] Any temporary mitigation is documented.
- [ ] Follow-up tasks are created.
- [ ] The incident record includes timeline, root cause, and prevention plan.

## After the incident

Write the follow-up within one business day. Keep it factual. The purpose is to improve the system, not assign blame.
`,
    contentJson: [
      image(imageUrls.incident, 'Operations room during incident response'),
      p(
        'Use this runbook when a production or staging issue affects users, data integrity, security, or critical development workflows.',
      ),
      h(2, 'Severity levels'),
      bullet('SEV1: critical user impact or data risk.'),
      bullet('SEV2: major workflow degraded.'),
      bullet('SEV3: limited impact or workaround exists.'),
      h(2, 'First 10 minutes'),
      checklist('Name an incident lead'),
      checklist('Create a dedicated chat thread or channel'),
      checklist('Write the current impact in one sentence'),
      checklist('Stop risky deployments until cleared'),
      h(2, 'Triage questions'),
      bullet('Is the issue still happening?'),
      bullet('Which users or organizations are affected?'),
      bullet('Did this start after a deploy, migration, config change, or dependency update?'),
      bullet('Is there a safe rollback path?'),
      h(2, 'Communication template'),
      quote('Status, impact, current action, and exact next update time.'),
      h(2, 'Resolution checklist'),
      checklist('User impact has stopped'),
      checklist('Data integrity has been checked'),
      checklist('Follow-up tasks are created'),
      checklist('Incident record includes timeline, root cause, and prevention plan'),
    ],
  },
];
