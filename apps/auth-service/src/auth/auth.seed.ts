/* eslint-disable max-len */
import {
  ChatConversationType,
  WorkspaceRole,
  WikiPageVisibility,
  Prisma,
  CalendarItemType,
  CalendarVisibility,
  CalendarTaskStatus,
  ContactType,
  ContactStatus,
  OfficeRoomType,
  TaskStatus,
  TaskPriority,
  TaskSourceType,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { seedDepartments, seedUsers, type SeedDepartmentKey, type SeedUserKey } from './seed-data/org-data';
import { wikiSeedPages } from './seed-data/wiki';

export async function seedOrganizationData(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgSlug: string,
  creatorUser: { id: string; displayName: string }
) {
  const passwordHash = await hash('password123', 10);

  const getOrCreateUser = async (email: string, displayName: string) => {
    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      user = await tx.user.create({ data: { email, displayName, passwordHash } });
    }
    return user;
  };

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const users = {} as Record<SeedUserKey, Awaited<ReturnType<typeof getOrCreateUser>>>;
  for (const user of seedUsers) {
    const email = typeof user.email === 'function' ? user.email(orgSlug) : user.email;
    users[user.key] = await getOrCreateUser(email, user.displayName);
  }
  const { alice, bob, david, mary, sarah, alex, john, emily } = users;

  // ── 2. Departments ────────────────────────────────────────────────────────
  const departments = {} as Record<SeedDepartmentKey, { id: string }>;
  for (const department of seedDepartments) {
    departments[department.key] = await tx.department.create({
      data: { orgId, name: department.name },
      select: { id: true },
    });
  }
  const engDept = departments.engineering;
  const mktDept = departments.marketing;
  const desDept = departments.design;

  const addWorkspaceMember = async (userId: string, role: WorkspaceRole, deptId: string | null) => {
    const existing = await tx.workspaceMember.findUnique({ where: { userId_orgId: { userId, orgId } } });
    if (!existing) {
      await tx.workspaceMember.create({ data: { orgId, userId, role, departmentId: deptId } });
    } else {
      await tx.workspaceMember.update({ where: { userId_orgId: { userId, orgId } }, data: { departmentId: deptId } });
    }
  };

  await addWorkspaceMember(creatorUser.id, WorkspaceRole.OWNER, engDept.id);
  await addWorkspaceMember(alice.id, WorkspaceRole.MEMBER, mktDept.id);
  await addWorkspaceMember(bob.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(david.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(mary.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(sarah.id, WorkspaceRole.MEMBER, mktDept.id);
  await addWorkspaceMember(alex.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(john.id, WorkspaceRole.MEMBER, engDept.id);
  await addWorkspaceMember(emily.id, WorkspaceRole.MEMBER, desDept.id);

  // ── 3. Contacts ───────────────────────────────────────────────────────────
  await tx.contact.createMany({
    data: [
      ...seedUsers.map((seedUser) => ({
        orgId,
        type: ContactType.EMPLOYEE,
        status: ContactStatus.ACTIVE,
        displayName: seedUser.displayName,
        email: users[seedUser.key].email,
        title: seedUser.title,
        phone: seedUser.phone,
        departmentId: departments[seedUser.department].id,
        notes: seedUser.notes,
      })),
      {
        orgId,
        type: ContactType.GUEST,
        status: ContactStatus.ACTIVE,
        displayName: 'Michael Torres',
        email: 'michael.torres@novatech.io',
        phone: '+1-555-0230',
        company: 'NovaTech Solutions',
        title: 'Head of Engineering',
        notes: 'Key client contact. Decision maker for the NovaTech workspace contract.',
      },
      {
        orgId,
        type: ContactType.GUEST,
        status: ContactStatus.ACTIVE,
        displayName: 'Linda Park',
        email: 'linda.park@venture-x.com',
        phone: '+1-555-0241',
        company: 'Venture X Capital',
        title: 'Partner',
        notes: 'Investor. Receives quarterly product updates. CC on all board-related communications.',
      },
      {
        orgId,
        type: ContactType.GUEST,
        status: ContactStatus.ACTIVE,
        displayName: 'James Okafor',
        email: 'j.okafor@designhub.co',
        phone: '+1-555-0259',
        company: 'DesignHub',
        title: 'Freelance Consultant',
        notes: 'External design contractor. Works with Emily on quarterly brand refresh projects.',
      },
    ],
  });

  // ── 4. Channels and DMs ───────────────────────────────────────────────────
  const generalChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'general',
      slug: 'general',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id }, { userId: alice.id }, { userId: bob.id },
          { userId: david.id }, { userId: mary.id }, { userId: sarah.id },
          { userId: alex.id }, { userId: john.id }, { userId: emily.id },
        ],
      },
    },
  });

  const randomChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'random',
      slug: 'random',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: bob.id,
      members: {
        create: [
          { userId: creatorUser.id }, { userId: alice.id }, { userId: bob.id },
          { userId: david.id }, { userId: mary.id }, { userId: sarah.id },
          { userId: alex.id }, { userId: john.id }, { userId: emily.id },
        ],
      },
    },
  });

  const engineeringChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'engineering',
      slug: 'engineering',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: alex.id,
      members: {
        create: [
          { userId: creatorUser.id }, { userId: bob.id }, { userId: david.id },
          { userId: mary.id }, { userId: alex.id }, { userId: john.id },
        ],
      },
    },
  });

  const marketingChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'marketing',
      slug: 'marketing',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: sarah.id,
      members: {
        create: [
          { userId: creatorUser.id }, { userId: alice.id }, { userId: sarah.id }, { userId: emily.id },
        ],
      },
    },
  });

  // DMs
  const dmSarahIds = [creatorUser.id, sarah.id].sort();
  const dmSarahConversation = await tx.chatConversation.create({
    data: {
      orgId, type: ChatConversationType.DM, dmKey: dmSarahIds.join('_'), createdById: creatorUser.id,
      members: { create: [{ userId: creatorUser.id }, { userId: sarah.id }] },
    },
  });

  const dmAliceIds = [creatorUser.id, alice.id].sort();
  const dmAliceConversation = await tx.chatConversation.create({
    data: {
      orgId, type: ChatConversationType.DM, dmKey: dmAliceIds.join('_'), createdById: creatorUser.id,
      members: { create: [{ userId: creatorUser.id }, { userId: alice.id }] },
    },
  });

  const dmBobIds = [creatorUser.id, bob.id].sort();
  const dmBobConversation = await tx.chatConversation.create({
    data: {
      orgId, type: ChatConversationType.DM, dmKey: dmBobIds.join('_'), createdById: creatorUser.id,
      members: { create: [{ userId: creatorUser.id }, { userId: bob.id }] },
    },
  });

  const dmAlexIds = [creatorUser.id, alex.id].sort();
  const dmAlexConversation = await tx.chatConversation.create({
    data: {
      orgId, type: ChatConversationType.DM, dmKey: dmAlexIds.join('_'), createdById: creatorUser.id,
      members: { create: [{ userId: creatorUser.id }, { userId: alex.id }] },
    },
  });

  const dmEmilyIds = [creatorUser.id, emily.id].sort();
  const dmEmilyConversation = await tx.chatConversation.create({
    data: {
      orgId, type: ChatConversationType.DM, dmKey: dmEmilyIds.join('_'), createdById: creatorUser.id,
      members: { create: [{ userId: creatorUser.id }, { userId: emily.id }] },
    },
  });

  // ── 5. Messages ───────────────────────────────────────────────────────────
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);
  const daysAgo = (days: number, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // #general — company-wide activity over the past week
  const generalMessages = [
    { authorId: alex.id,        content: `Sprint 12 is kicking off today. Our main goal is to get the AI evaluation pipeline to a stable, demo-able state. All seven agents should be scoring above 75% by end of sprint. Check the Q3 Roadmap wiki page for the full task breakdown.`, createdAt: daysAgo(7, 9, 0) },
    { authorId: bob.id,         content: `v2.2.0 is deployed to staging. Auth flow is stable, smoke tests passed. Running the full regression suite now — will share results in #engineering.`, createdAt: daysAgo(6, 10, 15) },
    { authorId: sarah.id,       content: `Q2 results are in: 2,300 new signups, 14% above target. Retention at 68%, up 5 points from Q1. Incredible work everyone — this is the best quarter we have had.`, createdAt: daysAgo(5, 11, 0) },
    { authorId: david.id,       content: `Heads up: I found a race condition in the token refresh endpoint. Two requests arriving within 100 ms both generate new tokens but only one gets saved to the DB. Patch is on PR #44. Please do not deploy auth-service until it is merged.`, createdAt: daysAgo(5, 14, 30) },
    { authorId: emily.id,       content: `New design tokens are live in the Brand & Design Guidelines wiki page. Key update: please use \`--brand-surface\` for page backgrounds from now on, not the old \`#f8fafc\` hardcode. I'll flag any remaining violations in PRs.`, createdAt: daysAgo(4, 9, 45) },
    { authorId: mary.id,        content: `QA complete on v2.2.0. Found two issues: (1) wiki editor loses cursor position after autosave on Firefox, (2) calendar event modal doesn't close on Escape key. Created tasks for John and Bob respectively.`, createdAt: daysAgo(4, 15, 0) },
    { authorId: creatorUser.id, content: `AI evaluation pipeline first pass results: wiki agent 78%, chat agent 81%, contacts agent 91%, calendar agent 82%, schedule agent 87%. Chat and mail are still below 75% — working on those datasets this week. Full report will be in the wiki by Friday.`, createdAt: daysAgo(3, 10, 0) },
    { authorId: alex.id,        content: `Those are great early numbers. Contacts at 91% is impressive. For chat and mail — let me know if you need more seed data or if it's a prompt issue. We can pair on it.`, createdAt: daysAgo(3, 10, 20) },
    { authorId: bob.id,         content: `v2.2.0 is live on production. Zero incidents. Rollback window is open until 6 PM if anything surfaces.`, createdAt: daysAgo(2, 9, 0) },
    { authorId: sarah.id,       content: `Reminder: company all-hands is next Thursday at 2 PM in the Main Conference Room. Agenda: Q3 roadmap review, product demo, marketing campaign preview. Please block the time.`, createdAt: daysAgo(2, 11, 0) },
    { authorId: alice.id,       content: `August content calendar is published: 3 blog posts (product update, customer story, engineering deep-dive), 12 social posts, 1 press release draft. Check the #marketing channel for the full schedule.`, createdAt: daysAgo(1, 9, 30) },
    { authorId: creatorUser.id, content: `Full evaluation report is in the wiki. Contacts agent is at 91% — best result so far. Mail agent is now at 76%, just above the threshold after improving the dataset. All agents are green.`, createdAt: daysAgo(1, 14, 0) },
    { authorId: john.id,        content: `OOO Thursday and Friday this week for a family thing. Bob can handle any frontend blockers. I'll be back Monday.`, createdAt: daysAgo(1, 16, 0) },
    { authorId: emily.id,       content: `Design review is tomorrow (Friday) at 3 PM. Agenda: new onboarding flow mockups and wiki editor mobile layouts. I'll share the Figma link in the calendar invite.`, createdAt: ago(120) },
  ];

  for (const msg of generalMessages) {
    await tx.chatMessage.create({ data: { conversationId: generalChannel.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // #random — casual conversation
  const randomMessages = [
    { authorId: bob.id,         content: `Anyone tried that new ramen place that opened on 5th? I went Tuesday and it was genuinely the best bowl I have had in this city.`, createdAt: daysAgo(6, 12, 30) },
    { authorId: emily.id,       content: `Yes! The tonkotsu is incredible. The line is rough on weekends though.`, createdAt: daysAgo(6, 12, 45) },
    { authorId: john.id,        content: `Adding it to the list. Also — anyone watching the new season of Severance? No spoilers but episode 3 is something else.`, createdAt: daysAgo(5, 19, 0) },
    { authorId: david.id,       content: `Finished it last weekend. The writing is so good. Completely different show from season 1.`, createdAt: daysAgo(5, 19, 20) },
    { authorId: alice.id,       content: `Okay question for the team: if you had to describe our product in one emoji what would it be?`, createdAt: daysAgo(3, 14, 0) },
    { authorId: emily.id,       content: `🏡 — it's where the team lives`, createdAt: daysAgo(3, 14, 10) },
    { authorId: bob.id,         content: `🧘 — serenity, obviously`, createdAt: daysAgo(3, 14, 15) },
    { authorId: creatorUser.id, content: `⚡ — because we're fast now that Bob fixed the Redis caching`, createdAt: daysAgo(3, 14, 25) },
    { authorId: bob.id,         content: `Ha, I'll take it.`, createdAt: daysAgo(3, 14, 28) },
    { authorId: sarah.id,       content: `We're using the 🏡 one in the launch campaign. Emily called it first.`, createdAt: daysAgo(2, 9, 15) },
  ];

  for (const msg of randomMessages) {
    await tx.chatMessage.create({ data: { conversationId: randomChannel.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // #engineering — technical discussions
  const engineeringMessages = [
    { authorId: david.id,       content: `Found the root cause of the token refresh race condition. Two concurrent requests to \`POST /api/auth/refresh\` both read the current token, both validate it, and both try to write a new one. Only the second write wins, so the first client's new token is immediately invalidated. Fixing with a Redis SETNX lock with a 500 ms TTL. PR #44 is up.`, createdAt: daysAgo(5, 10, 0) },
    { authorId: bob.id,         content: `Reviewing #44 now. The Redis lock approach is clean. One suggestion: add a retry with exponential backoff on the client side for the 409 case, so users don't see a visible error on the rare collision.`, createdAt: daysAgo(5, 10, 30) },
    { authorId: david.id,       content: `Good call. Added a 2-attempt retry with 200 ms delay in the auth service before returning 409. Client will almost never see it now.`, createdAt: daysAgo(5, 11, 0) },
    { authorId: john.id,        content: `Approved #44. Also noticed the cookie \`Max-Age\` doesn't match the JWT \`exp\` claim — cookie expires 24 h after issue but JWT is 8 h. Separate issue?`, createdAt: daysAgo(5, 14, 0) },
    { authorId: david.id,       content: `Yes, that is issue #46. It's intentional for now (keeps users logged in across short JWT rotations) but I agree it's confusing. I'll add a proper refresh-token flow in Sprint 13 to replace the workaround.`, createdAt: daysAgo(5, 14, 20) },
    { authorId: mary.id,        content: `PR #47 is up — wiki search Vietnamese character fix. The problem was that Prisma's \`contains\` filter doesn't normalize Unicode, so "café" and "cafe" were treated as different strings. Fixed with a Postgres \`unaccent\` extension call. Small change, should be a quick review.`, createdAt: daysAgo(4, 14, 0) },
    { authorId: bob.id,         content: `Reviewed #47. LGTM. Left one comment: the \`unaccent\` extension needs to be enabled in the migration, not just called at query time. Make sure it's in the migration file.`, createdAt: daysAgo(4, 15, 30) },
    { authorId: mary.id,        content: `Fixed — added \`CREATE EXTENSION IF NOT EXISTS unaccent;\` to the migration. Ready to merge.`, createdAt: daysAgo(4, 16, 0) },
    { authorId: alex.id,        content: `Team — proposal for Sprint 13: move the AI service behind the gateway so there's no direct external access to port 8000. All AI requests go through \`/api/ai/*\` on the gateway. The eval notebook would route through the gateway too. Opinions?`, createdAt: daysAgo(3, 11, 0) },
    { authorId: creatorUser.id, content: `Agreed. I'll need to update the evaluation notebook to use the gateway URL, but that's a 5-minute change. The security improvement is worth it.`, createdAt: daysAgo(3, 11, 15) },
    { authorId: bob.id,         content: `+1. I can add the proxy config to the gateway this sprint — it's about an hour of work. I'll also add rate limiting specific to the AI endpoints (separate budget from the rest of the API).`, createdAt: daysAgo(3, 11, 20) },
    { authorId: alex.id,        content: `Perfect. Bob, go ahead and add it to your Sprint 12 tasks. Let's not wait until Sprint 13 for the gateway config since it's small.`, createdAt: daysAgo(3, 11, 30) },
    { authorId: bob.id,         content: `Core service is on v2.3.0-rc now. Released to staging at 11 PM last night. Main changes: gateway proxy for AI service, Redis monitoring hooks, and the rate limiter. Mary — can you run a focused QA pass on the AI endpoints today?`, createdAt: daysAgo(1, 9, 0) },
    { authorId: mary.id,        content: `On it. I'll run the evaluation notebook against staging first to confirm the AI endpoint is reachable through the gateway, then run the UI smoke tests.`, createdAt: daysAgo(1, 9, 20) },
    { authorId: mary.id,        content: `QA pass done on v2.3.0-rc. AI endpoints through the gateway: all good. Rate limiter working — tested with 20 concurrent requests and it correctly queued and throttled. Found one issue: the \`X-RateLimit-Remaining\` header is missing from the response. Minor, creating a task.`, createdAt: daysAgo(1, 14, 30) },
  ];

  for (const msg of engineeringMessages) {
    await tx.chatMessage.create({ data: { conversationId: engineeringChannel.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // #marketing — campaign planning
  const marketingMessages = [
    { authorId: sarah.id,       content: `Q3 campaign brief is ready. Theme: "Your whole team, one place." Product launch target: September 15. I need Alice and Emily to review by end of day Friday and leave comments.`, createdAt: daysAgo(6, 11, 0) },
    { authorId: alice.id,       content: `Read it. The theme is strong and the messaging is consistent. One suggestion: change the primary CTA from "Get started" to "Start free" — in past A/B tests the "free" callout increased click-through rate by 23%.`, createdAt: daysAgo(6, 14, 0) },
    { authorId: emily.id,       content: `Hero image concepts are ready — three options uploaded to Figma. Each uses the brand color palette with different photography styles. Vote by reacting to this message: 1️⃣ for modern office, 2️⃣ for team collaboration, 3️⃣ for abstract product screenshot.`, createdAt: daysAgo(5, 10, 0) },
    { authorId: sarah.id,       content: `Option 2 wins — 5 votes vs 2 for option 1. Emily, can you finalize it with the brand font and correct hex values by end of Monday?`, createdAt: daysAgo(5, 16, 0) },
    { authorId: emily.id,       content: `Done. Final hero image is in the Figma file and exported to the shared drive. Used the updated brand tokens — \`--brand\` for the text overlay and \`--brand-surface\` for the gradient background.`, createdAt: daysAgo(4, 11, 30) },
    { authorId: alice.id,       content: `August content calendar is fully scheduled: 3 blog posts (product update July 28, customer story August 5, engineering deep-dive August 12), 12 social posts, and 1 press release draft for the September 15 launch. Everything is in the content tracker.`, createdAt: daysAgo(3, 9, 0) },
    { authorId: sarah.id,       content: `The product launch blog post needs to include the AI evaluation results — the numbers are genuinely impressive. Can someone from engineering write a 500-word technical summary? Audience is CTOs and engineering leads, not general public.`, createdAt: daysAgo(3, 11, 0) },
    { authorId: creatorUser.id, content: `I can write it. I'll draft a summary covering the evaluation methodology, the six agents, and the key accuracy numbers. Should have a draft by next Wednesday.`, createdAt: daysAgo(3, 11, 20) },
    { authorId: alice.id,       content: `Social posts for July are scheduled. Engagement on the "Building in public" series is up 34% from last month — the post about the AI agent architecture got 1,200 impressions.`, createdAt: daysAgo(2, 10, 0) },
    { authorId: sarah.id,       content: `Marketing sync is tomorrow (Tuesday) at 2 PM. Agenda: launch checklist review, assign September campaign tasks, and a first look at the press release draft. Please come prepared with your section status.`, createdAt: ago(180) },
  ];

  for (const msg of marketingMessages) {
    await tx.chatMessage.create({ data: { conversationId: marketingChannel.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // DM: creator ↔ Sarah Connor
  const dmSarahMessages = [
    { authorId: sarah.id,       content: `Are you available for a quick call today? I want to walk through the Q3 board presentation before I send it to Linda Park at Venture X.`, createdAt: daysAgo(3, 10, 0) },
    { authorId: creatorUser.id, content: `Yes, 2 PM works for me.`, createdAt: daysAgo(3, 10, 5) },
    { authorId: sarah.id,       content: `Great. One thing I need before the call — can you confirm the AI infrastructure cost for Q3? I need a monthly number for the financials slide.`, createdAt: daysAgo(3, 10, 8) },
    { authorId: creatorUser.id, content: `It's roughly $2,400/month. That covers the GPU instances for inference, OpenAI API costs for evaluation, and the Redis cluster. The number should drop by about 30% once we move to our own model for G-Eval scoring.`, createdAt: daysAgo(3, 10, 15) },
    { authorId: sarah.id,       content: `Perfect. The ROI story is strong — the AI assistant is saving teams an average of 40 minutes per day based on the NovaTech case study. I'll build the slide around that.`, createdAt: daysAgo(3, 10, 25) },
    { authorId: creatorUser.id, content: `Agreed. If you need more granular usage data I can pull it from the analytics DB before the call.`, createdAt: daysAgo(3, 10, 28) },
    { authorId: sarah.id,       content: `That would be great — specifically total AI interactions per week and the breakdown by agent type. Linda will ask about usage depth.`, createdAt: daysAgo(3, 10, 35) },
    { authorId: creatorUser.id, content: `Sent you a CSV. Key number: 12,400 AI interactions last week. Wiki agent is the most used (34%), followed by chat assist (28%).`, createdAt: daysAgo(2, 9, 0) },
  ];

  for (const msg of dmSarahMessages) {
    await tx.chatMessage.create({ data: { conversationId: dmSarahConversation.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // DM: creator ↔ Alice Nguyen
  const dmAliceMessages = [
    { authorId: alice.id,       content: `Hey! Did you get a chance to look at the new landing page copy I pushed to staging?`, createdAt: daysAgo(2, 15, 0) },
    { authorId: creatorUser.id, content: `Just reviewed it. The headline is great — "Your whole team, one place" is clean and direct. One suggestion: the CTA button should say "Start free" not "Get started". More specific, less friction.`, createdAt: daysAgo(2, 15, 20) },
    { authorId: alice.id,       content: `That's exactly the change Sarah and I were debating. I'll update it and push a new build to staging now.`, createdAt: daysAgo(2, 15, 30) },
    { authorId: creatorUser.id, content: `Also — can we add a short testimonial below the hero? The NovaTech quote is really compelling: "Serenity cut our meeting overhead by 40%. We ship twice as fast." Michael Torres gave us permission to use it.`, createdAt: daysAgo(2, 15, 35) },
    { authorId: alice.id,       content: `Love it. I'll add it to the testimonials section with Michael's name and title. Staging should be ready in about 20 minutes for you to check.`, createdAt: daysAgo(2, 15, 40) },
    { authorId: creatorUser.id, content: `Looks great on staging. The testimonial really anchors the credibility. Ship it.`, createdAt: daysAgo(1, 10, 0) },
    { authorId: alice.id,       content: `Deployed to production at 11 AM. Already seeing a 6% improvement in the hero section click-through rate compared to yesterday.`, createdAt: daysAgo(1, 14, 0) },
  ];

  for (const msg of dmAliceMessages) {
    await tx.chatMessage.create({ data: { conversationId: dmAliceConversation.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // DM: creator ↔ Bob Chen
  const dmBobMessages = [
    { authorId: creatorUser.id, content: `Hey Bob — PR #52 is up. It touches the Redis session layer — specifically how we handle session fallback when Redis is unavailable. Want a second pair of eyes before I merge.`, createdAt: daysAgo(2, 11, 0) },
    { authorId: bob.id,         content: `On it. Give me 20 minutes.`, createdAt: daysAgo(2, 11, 3) },
    { authorId: bob.id,         content: `Left 3 comments. Main issue: the error path when Redis goes down throws a 500, which surfaces to the user as a login failure. We should degrade gracefully — fall back to the DB session store and continue, just with a warning in the logs.`, createdAt: daysAgo(2, 11, 35) },
    { authorId: creatorUser.id, content: `Good catch. Updated — Redis failure now catches the error, logs a warning, and falls back to the Prisma session store. The user experience is unaffected. Ready for re-review.`, createdAt: daysAgo(2, 13, 0) },
    { authorId: bob.id,         content: `Much better. One last thing — did you update the health check endpoint to report "degraded" mode when Redis is down, instead of "ok"? Operators need to know the service is running in fallback.`, createdAt: daysAgo(2, 13, 30) },
    { authorId: creatorUser.id, content: `Just added it. Health check now returns \`{"status":"degraded","redis":"unavailable","session":"db-fallback"}\` when Redis is down. All other paths still return \`{"status":"ok"}\`.`, createdAt: daysAgo(2, 14, 0) },
    { authorId: bob.id,         content: `Approved and merged. That graceful degradation pattern is something we should apply to the other Redis-dependent paths too. I'll create a tracking task.`, createdAt: daysAgo(2, 14, 10) },
  ];

  for (const msg of dmBobMessages) {
    await tx.chatMessage.create({ data: { conversationId: dmBobConversation.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // DM: creator ↔ Alex Vance
  const dmAlexMessages = [
    { authorId: alex.id,        content: `How is the evaluation pipeline looking? I want to do a live demo at the all-hands on Thursday. Need to know if it's stable enough to run in front of Linda Park and Michael Torres.`, createdAt: daysAgo(3, 9, 0) },
    { authorId: creatorUser.id, content: `All 7 agents are running and producing stable scores. Wiki at 78%, chat at 81%, contacts at 91%, calendar at 82%, schedule at 87%, mail at 76%, chat assist at 79%. All above the 75% threshold now.`, createdAt: daysAgo(3, 9, 15) },
    { authorId: alex.id,        content: `That is excellent progress. Can you have the per-metric breakdowns in the results page by Wednesday so I can review before the demo? I want to anticipate any questions Linda might ask.`, createdAt: daysAgo(3, 9, 20) },
    { authorId: creatorUser.id, content: `Yes. I'll add answer relevancy, faithfulness, and contextual recall breakdowns for each agent to the evaluation wiki page. Should be done by Tuesday EOD.`, createdAt: daysAgo(3, 9, 30) },
    { authorId: alex.id,        content: `Also — I'm planning to have Mary join the AI evaluation effort in Sprint 13 to help maintain the datasets as the product evolves. Can you loop her in when the datasets are finalized?`, createdAt: daysAgo(3, 9, 40) },
    { authorId: creatorUser.id, content: `Absolutely. I'll share the evaluation notebook and a walkthrough doc with her today. The dataset format is straightforward once you understand the structure.`, createdAt: daysAgo(3, 9, 45) },
    { authorId: alex.id,        content: `Great. One more thing — for the demo, can we have a "live query" section where I type a question and the AI answers it in real time? The canned screenshots feel less impressive than a live demo.`, createdAt: daysAgo(2, 10, 0) },
    { authorId: creatorUser.id, content: `Yes. I'll set up a demo workspace with realistic data so the answers are compelling. The contacts and wiki agents give the most impressive results for a live demo.`, createdAt: daysAgo(2, 10, 10) },
  ];

  for (const msg of dmAlexMessages) {
    await tx.chatMessage.create({ data: { conversationId: dmAlexConversation.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // DM: creator ↔ Emily Rose
  const dmEmilyMessages = [
    { authorId: emily.id,       content: `Quick question on the wiki editor mobile layout — should I design it mobile-first from scratch or adapt the desktop layout? The two have pretty different interaction patterns.`, createdAt: daysAgo(2, 14, 0) },
    { authorId: creatorUser.id, content: `Mobile-first is better. The wiki is accessed on phone a lot during standups and meetings, and the desktop editor has too many toolbars to just shrink down. A fresh mobile design will be cleaner.`, createdAt: daysAgo(2, 14, 15) },
    { authorId: emily.id,       content: `That's what I was leaning toward. I'll hide the formatting toolbar behind a floating action button and prioritize the reading flow. Mockups will be ready for the Friday review.`, createdAt: daysAgo(2, 14, 25) },
    { authorId: creatorUser.id, content: `Sounds perfect. One thing to design for: users need to be able to add checkboxes and headings from mobile since the onboarding checklist is commonly edited on phone.`, createdAt: daysAgo(2, 14, 30) },
    { authorId: emily.id,       content: `Got it — I'll add a persistent "quick insert" row with the most common block types (heading, checklist, bullet) pinned above the keyboard. See you at the review tomorrow!`, createdAt: daysAgo(1, 9, 0) },
  ];

  for (const msg of dmEmilyMessages) {
    await tx.chatMessage.create({ data: { conversationId: dmEmilyConversation.id, authorId: msg.authorId, content: msg.content, createdAt: msg.createdAt, updatedAt: msg.createdAt } });
  }

  // ── 6. Office Rooms ───────────────────────────────────────────────────────
  const roomA = await tx.officeRoom.create({ data: { orgId, name: 'Room A', type: OfficeRoomType.FOCUS, createdById: creatorUser.id } });
  const roomB = await tx.officeRoom.create({ data: { orgId, name: 'Room B', type: OfficeRoomType.OPEN, createdById: creatorUser.id } });
  const mainHall = await tx.officeRoom.create({ data: { orgId, name: 'Main Hall', type: OfficeRoomType.OPEN, createdById: creatorUser.id } });
  const conferenceRoom = await tx.officeRoom.create({ data: { orgId, name: 'Main Conference Room', type: OfficeRoomType.OPEN, createdById: creatorUser.id } });

  // ── 7. Wiki Pages ─────────────────────────────────────────────────────────
  const createdWikiPages: Array<{ id: string; title: string; contentMarkdown: string; contentJson: any }> = [];
  for (const page of wikiSeedPages) {
    const fallbackContentJson = [
      { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: page.title, styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: page.contentMarkdown.substring(0, 300), styles: {} }] },
    ];
    const createdPage = await tx.wikiPage.create({
      data: {
        orgId,
        createdById: creatorUser.id,
        title: page.title,
        icon: page.icon,
        coverColor: page.coverColor,
        visibility: WikiPageVisibility.WORKSPACE,
        contentMarkdown: page.contentMarkdown,
        contentJson: (page.contentJson ?? fallbackContentJson) as Prisma.InputJsonValue,
      },
    });
    createdWikiPages.push({ id: createdPage.id, title: createdPage.title, contentMarkdown: createdPage.contentMarkdown, contentJson: createdPage.contentJson });
  }

  // ── 8. Calendar Events ────────────────────────────────────────────────────
  const today = new Date(now);
  const tomorrow = new Date(now.getTime() + 1000 * 60 * 60 * 24);

  const friday = new Date();
  friday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
  friday.setHours(15, 0, 0, 0);

  const nextMonday = new Date();
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  nextMonday.setHours(9, 0, 0, 0);

  const nextTuesday = new Date(nextMonday); nextTuesday.setDate(nextMonday.getDate() + 1); nextTuesday.setHours(10, 0, 0, 0);
  const nextWednesday = new Date(nextMonday); nextWednesday.setDate(nextMonday.getDate() + 2); nextWednesday.setHours(9, 0, 0, 0);
  const nextThursday = new Date(nextMonday); nextThursday.setDate(nextMonday.getDate() + 3); nextThursday.setHours(9, 0, 0, 0);
  const nextFriday = new Date(nextMonday); nextFriday.setDate(nextMonday.getDate() + 4); nextFriday.setHours(9, 0, 0, 0);

  // Daily standup — today at 10 AM
  const standupStart = new Date(today); standupStart.setHours(10, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Daily Standup',
      descriptionMarkdown: 'Daily 15-minute sync. Each person covers: what I shipped yesterday, what I am working on today, and any blockers.',
      startAt: standupStart, endAt: new Date(standupStart.getTime() + 1000 * 60 * 30),
      attendees: { create: [{ userId: creatorUser.id }, { userId: bob.id }, { userId: david.id }, { userId: mary.id }, { userId: john.id }] },
    },
  });

  // Design Review — this Friday 3 PM
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Design Review — Sprint 12',
      descriptionMarkdown: 'Agenda: (1) Wiki editor mobile layout mockups from Emily, (2) onboarding flow redesign, (3) new design token audit. Please review the Brand & Design Guidelines wiki page before the meeting.',
      startAt: friday, endAt: new Date(friday.getTime() + 1000 * 60 * 90),
      roomId: roomA.id,
      attendees: { create: [{ userId: creatorUser.id }, { userId: emily.id }, { userId: john.id }, { userId: alex.id }] },
    },
  });

  // Weekly all-team standup — next Monday 9 AM
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Weekly Team Standup',
      descriptionMarkdown: 'Monday kick-off for the whole team. Sprint progress check, any cross-team blockers, and announcements.',
      startAt: nextMonday, endAt: new Date(nextMonday.getTime() + 1000 * 60 * 60),
      attendees: { create: [{ userId: creatorUser.id }, { userId: alice.id }, { userId: bob.id }, { userId: david.id }, { userId: mary.id }, { userId: sarah.id }, { userId: alex.id }, { userId: emily.id }, { userId: john.id }] },
    },
  });

  // Sprint planning — next Monday 11 AM
  const planningStart = new Date(nextMonday); planningStart.setHours(11, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Sprint 13 Planning',
      descriptionMarkdown: 'Sprint 13 planning session. Review Sprint 12 outcomes, estimate and assign Sprint 13 items. Bring your capacity for the next two weeks. Engineering items are pre-groomed — see the Q3 Roadmap wiki page.',
      startAt: planningStart, endAt: new Date(planningStart.getTime() + 1000 * 60 * 90),
      roomId: roomB.id,
      attendees: { create: [{ userId: creatorUser.id }, { userId: alex.id }, { userId: bob.id }, { userId: david.id }, { userId: mary.id }, { userId: john.id }] },
    },
  });

  // Marketing sync — next Tuesday 2 PM
  const mktSyncStart = new Date(nextTuesday); mktSyncStart.setHours(14, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: sarah.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Marketing Sync — September Launch',
      descriptionMarkdown: 'Agenda: launch checklist review, press release draft feedback, content calendar assignments for August. Alice will present the updated social calendar. Sarah will review the go-to-market timeline.',
      startAt: mktSyncStart, endAt: new Date(mktSyncStart.getTime() + 1000 * 60 * 60),
      attendees: { create: [{ userId: sarah.id }, { userId: alice.id }, { userId: emily.id }, { userId: creatorUser.id }] },
    },
  });

  // Client call — next Tuesday 10 AM
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Product Review Call — NovaTech Solutions',
      descriptionMarkdown: 'Quarterly review with Michael Torres (Head of Engineering, NovaTech). Agenda: Q2 usage report, Q3 feature roadmap, collecting feedback on the AI assistant rollout. Alex and creator attending.',
      startAt: nextTuesday, endAt: new Date(nextTuesday.getTime() + 1000 * 60 * 60),
      attendees: { create: [{ userId: creatorUser.id }, { userId: alex.id }] },
    },
  });

  // 1-on-1 creator & Alex — next Wednesday 11 AM
  const oneOnOneStart = new Date(nextWednesday); oneOnOneStart.setHours(11, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: alex.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.PERSONAL,
      title: '1-on-1: Alex & Huy',
      descriptionMarkdown: 'Recurring weekly 1-on-1. Topics this week: Sprint 12 eval pipeline status, Sprint 13 scope, demo preparation for all-hands, Mary\'s onboarding to evaluation team.',
      startAt: oneOnOneStart, endAt: new Date(oneOnOneStart.getTime() + 1000 * 60 * 30),
      attendees: { create: [{ userId: creatorUser.id }, { userId: alex.id }] },
    },
  });

  // Architecture review — next Wednesday 3 PM
  const archStart = new Date(nextWednesday); archStart.setHours(15, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: alex.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Architecture Review: AI Gateway Migration',
      descriptionMarkdown: 'Review the proposal to move the AI service behind the gateway. Bob will walk through the proxy config. David will present the revised internal token auth. Goal: approve the design and unblock Sprint 13 implementation.',
      startAt: archStart, endAt: new Date(archStart.getTime() + 1000 * 60 * 60),
      roomId: roomB.id,
      attendees: { create: [{ userId: alex.id }, { userId: bob.id }, { userId: david.id }, { userId: creatorUser.id }] },
    },
  });

  // All-hands & product demo — next Thursday 2 PM
  const allHandsStart = new Date(nextThursday); allHandsStart.setHours(14, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: alex.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Company All-Hands & Product Demo',
      descriptionMarkdown: 'Quarterly all-hands meeting. Agenda: Q2 results (Sarah), Q3 roadmap (Alex), live AI assistant demo (Huy), marketing campaign preview (Alice). External guests: Linda Park (Venture X), Michael Torres (NovaTech).',
      startAt: allHandsStart, endAt: new Date(allHandsStart.getTime() + 1000 * 60 * 90),
      roomId: conferenceRoom.id,
      attendees: { create: [{ userId: creatorUser.id }, { userId: alice.id }, { userId: bob.id }, { userId: david.id }, { userId: mary.id }, { userId: sarah.id }, { userId: alex.id }, { userId: emily.id }, { userId: john.id }] },
    },
  });

  // Q3 Sprint Retrospective — next Friday 2 PM
  const retroStart = new Date(nextFriday); retroStart.setHours(14, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.COMPANY,
      title: 'Sprint 12 Retrospective',
      descriptionMarkdown: 'Sprint 12 retrospective. Format: What went well, what could be better, what do we change in Sprint 13. Facilitator: Mary Watson. Please add your notes to the shared doc before the meeting.',
      startAt: retroStart, endAt: new Date(retroStart.getTime() + 1000 * 60 * 60),
      attendees: { create: [{ userId: creatorUser.id }, { userId: bob.id }, { userId: david.id }, { userId: mary.id }, { userId: alex.id }, { userId: john.id }] },
    },
  });

  // Room A booking — tomorrow 10 AM
  const roomAStart = new Date(tomorrow); roomAStart.setHours(10, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.EVENT, visibility: CalendarVisibility.COMPANY,
      title: 'Focused Work Session — Room A',
      descriptionMarkdown: 'Booked for AI evaluation dataset review. Do not disturb.',
      roomId: roomA.id,
      startAt: roomAStart, endAt: new Date(roomAStart.getTime() + 1000 * 60 * 120),
    },
  });

  // Conference room booking — next Thursday 9 AM for demo setup
  const demoSetupStart = new Date(nextThursday); demoSetupStart.setHours(9, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.EVENT, visibility: CalendarVisibility.COMPANY,
      title: 'Demo Setup — Main Conference Room',
      descriptionMarkdown: 'Pre-all-hands setup: AV check, demo environment validation, presentation run-through.',
      roomId: conferenceRoom.id,
      startAt: demoSetupStart, endAt: new Date(demoSetupStart.getTime() + 1000 * 60 * 90),
    },
  });

  // Coffee chat with Emily — next Monday 3 PM
  const coffeeStart = new Date(nextMonday); coffeeStart.setHours(15, 0, 0, 0);
  await tx.calendarItem.create({
    data: {
      orgId, createdById: creatorUser.id, type: CalendarItemType.MEETING, visibility: CalendarVisibility.PERSONAL,
      title: 'Coffee chat — Emily',
      descriptionMarkdown: 'Informal catchup. Check in on the mobile wiki editor project and design system progress.',
      startAt: coffeeStart, endAt: new Date(coffeeStart.getTime() + 1000 * 60 * 30),
      attendees: { create: [{ userId: creatorUser.id }, { userId: emily.id }] },
    },
  });

  // ── 9. Calendar personal reminders (CalendarItem.TASK — visible in calendar view) ──
  const fridayEOD = new Date(friday); fridayEOD.setHours(17, 0, 0, 0);
  const tomorrowEOD = new Date(tomorrow); tomorrowEOD.setHours(17, 0, 0, 0);
  const nextMondayEOD = new Date(nextMonday); nextMondayEOD.setHours(17, 0, 0, 0);
  const nextTuesdayEOD = new Date(nextTuesday); nextTuesdayEOD.setHours(17, 0, 0, 0);
  const nextWednesdayEOD = new Date(nextWednesday); nextWednesdayEOD.setHours(17, 0, 0, 0);
  const nextThursdayEOD = new Date(nextThursday); nextThursdayEOD.setHours(17, 0, 0, 0);
  const nextFridayEOD = new Date(nextFriday); nextFridayEOD.setHours(17, 0, 0, 0);

  const calendarReminders = [
    { title: 'Review Q3 budget doc before board call', createdById: creatorUser.id, dueDate: tomorrowEOD, taskStatus: CalendarTaskStatus.TODO },
    { title: 'Send demo environment credentials to Alex', createdById: creatorUser.id, dueDate: nextWednesdayEOD, taskStatus: CalendarTaskStatus.TODO },
    { title: 'Follow up with Michael Torres post-call', createdById: creatorUser.id, dueDate: nextTuesdayEOD, taskStatus: CalendarTaskStatus.TODO },
    { title: 'Confirm all-hands room booking', createdById: creatorUser.id, dueDate: nextWednesdayEOD, taskStatus: CalendarTaskStatus.TODO },
    { title: 'Share evaluation report with Alex', createdById: creatorUser.id, dueDate: fridayEOD, taskStatus: CalendarTaskStatus.DONE },
    { title: 'Write retro notes before Friday session', createdById: creatorUser.id, dueDate: nextFridayEOD, taskStatus: CalendarTaskStatus.TODO },
    { title: 'Update DB backup config', createdById: david.id, dueDate: nextSunday(now), taskStatus: CalendarTaskStatus.TODO },
    { title: 'Book security audit vendor call', createdById: alex.id, dueDate: nextMondayEOD, taskStatus: CalendarTaskStatus.TODO },
  ];

  for (const r of calendarReminders) {
    await tx.calendarItem.create({
      data: {
        orgId,
        createdById: r.createdById,
        type: CalendarItemType.TASK,
        visibility: CalendarVisibility.PERSONAL,
        title: r.title,
        taskStatus: r.taskStatus,
        dueDate: r.dueDate,
      },
    });
  }

  // ── 10. Project Tasks (Task model — visible in the task manager) ────────────
  const taskRecords: Array<{
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    createdBy: string;
    dueDate: Date | null;
  }> = [
    // Engineering — In Progress
    { title: 'Integrate G-Eval metric into evaluation pipeline', description: 'Replace the placeholder extraction_accuracy metric with the real GEval implementation using GPT-4o-mini. All 7 agent datasets need to re-run after the change.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: fridayEOD },
    { title: 'Add gateway proxy config for AI service', description: 'Move AI service behind the gateway — no direct external access to port 8000. Add /api/ai/* proxy route and update the evaluation notebook to use the gateway URL.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeId: bob.id, createdBy: bob.id, dueDate: fridayEOD },
    { title: 'Design mobile layout for wiki editor', description: 'Mobile-first redesign: floating action button for toolbar, persistent quick-insert row above keyboard for heading, checklist, and bullet. Present mockups at Friday design review.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeId: emily.id, createdBy: emily.id, dueDate: fridayEOD },
    { title: 'Set up GitHub Actions workflow for ai-service', description: 'Create .github/workflows/ai-service.yml with lint, test, and build steps. Must integrate with Nx affected detection so it only runs on relevant changes.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeId: john.id, createdBy: john.id, dueDate: nextWednesdayEOD },
    // Engineering — Todo
    { title: 'Finalize evaluation dataset for mail agent', description: 'Add 5 more test cases covering email thread summarization and draft reply. Target: 20 cases total, 75% pass rate. Coordinate with Alex on the demo dataset.', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: nextTuesdayEOD },
    { title: 'Add rate limiting to AI service endpoint', description: 'Separate rate limit budget for /api/ai/* endpoints: 60 req/min per org, 10 req/min per user. Add X-RateLimit-Remaining header to every response.', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeId: bob.id, createdBy: bob.id, dueDate: nextTuesdayEOD },
    { title: 'Fix timezone display bug in calendar event modal', description: 'Events created in UTC are shown in UTC in the modal instead of the browser\'s local timezone. Fix the date formatter in the calendar event component.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: john.id, createdBy: john.id, dueDate: fridayEOD },
    { title: 'Set up Redis monitoring and PagerDuty alerts', description: 'Expose Redis INFO metrics via the health check endpoint. Alert when memory usage exceeds 80% or connection pool drops below 5.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: david.id, createdBy: david.id, dueDate: nextFridayEOD },
    { title: 'Migrate user avatars to S3 object storage', description: 'Currently stored on local disk, which breaks in multi-instance deployments. Migrate to S3-compatible storage with presigned URLs for client-side access.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: david.id, createdBy: david.id, dueDate: nextFridayEOD },
    { title: 'Localize UI strings for Vietnamese locale', description: 'Add vi locale to next-intl. Priority screens: navigation, auth, settings, empty states. Coordinate with Alice for marketing copy translations.', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: john.id, createdBy: john.id, dueDate: nextFridayEOD },
    { title: 'Update OpenAPI documentation for core-service', description: 'Document all new endpoints added in Sprint 11–12: /api/contacts, /api/wiki/search, /api/calendar/rooms. Include request/response examples with realistic payloads.', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: nextMondayEOD },
    { title: 'Publish changelog for v2.3.0', description: 'Write user-facing changelog: AI service gateway migration, rate limiting, Redis graceful fallback, wiki Unicode search fix. Publish to the docs site before the all-hands.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: tomorrowEOD },
    { title: 'Prepare live demo environment for all-hands', description: 'Seed demo org with realistic data (wiki, calendar, contacts). Validate all 7 AI agents work against demo data. Must be stable before Thursday 9 AM setup session.', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: nextWednesdayEOD },
    { title: 'Write engineering blog post on AI evaluation methodology', description: 'Audience: CTOs and engineering leads. Cover the evaluation framework, the 6 agents, accuracy methodology, and key scores. ~500 words. Target publication: August 12.', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: nextWednesdayEOD },
    { title: 'Run full regression suite on v2.3.0-rc', description: 'Run the complete end-to-end test suite against v2.3.0-rc on staging. Focus areas: auth flows, wiki editor, calendar, AI endpoints. Must pass before production deploy.', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeId: mary.id, createdBy: mary.id, dueDate: fridayEOD },
    { title: 'Schedule Q3 security audit', description: 'Engage an external security firm for a focused audit of the auth service and JWT handling. Get quotes from two vendors. Target audit window: August 2025.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: alex.id, createdBy: alex.id, dueDate: nextMondayEOD },
    { title: 'Review intern interview candidates', description: 'Three candidates for the summer engineering intern position. Review portfolios and schedule technical screens for the two strongest candidates before end of next week.', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: alex.id, createdBy: alex.id, dueDate: nextMondayEOD },
    { title: 'Finalize Q3 OKR tracking spreadsheet', description: 'Fill in Sprint 12 actuals for all 5 key results. Share with Linda Park (Venture X) before the all-hands on Thursday.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: alex.id, createdBy: alex.id, dueDate: fridayEOD },
    // Engineering — Done
    { title: 'Fix race condition in token refresh endpoint', description: 'PR #44 — Redis SETNX lock with 500ms TTL. Added client-side retry with exponential backoff. Merged and deployed to production.', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeId: david.id, createdBy: david.id, dueDate: null },
    { title: 'Wiki search Unicode normalization fix', description: 'PR #47 — added Postgres unaccent extension. Vietnamese and accented characters now match correctly in full-text search.', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, assigneeId: mary.id, createdBy: mary.id, dueDate: null },
    { title: 'Redis graceful fallback for session store', description: 'PR #52 — when Redis is unavailable, auth falls back to Prisma DB session store with a "degraded" health check status. No user-visible failure.', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: null },
    // Marketing — Todo / In Progress / Done
    { title: 'Draft press release for September 15 product launch', description: 'Audience: tech press and B2B SaaS journalists. Lead with the AI agent story and the NovaTech customer quote. Sarah reviews before August 30 publish date.', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeId: alice.id, createdBy: alice.id, dueDate: nextWednesdayEOD },
    { title: 'Write August content calendar posts', description: 'Three posts: product update (July 28), customer story NovaTech (August 5), engineering deep-dive AI evaluation (August 12). Coordinate with engineering for the third post.', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeId: alice.id, createdBy: alice.id, dueDate: nextMondayEOD },
    { title: 'Conduct usability testing — new onboarding flow', description: '5 participants, 30 minutes each. Focus: first signup, connecting first channel, using the AI assistant for the first time. Emily to observe all sessions.', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: emily.id, createdBy: emily.id, dueDate: nextThursdayEOD },
    { title: 'Update onboarding guide screenshots', description: 'Replace the old UI screenshots with updated screens from v2.2.0. Covers: workspace creation, channel setup, wiki first page, calendar first event.', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: creatorUser.id, createdBy: creatorUser.id, dueDate: null },
    { title: 'Draft Q3 marketing brief and campaign plan', description: 'Theme: "Your whole team, one place." Channels: SEO blog, social (LinkedIn, Twitter), email newsletter, paid LinkedIn. Budget: $8,000 for the quarter.', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeId: sarah.id, createdBy: sarah.id, dueDate: null },
    { title: 'Publish August social calendar', description: '12 social posts scheduled through August 20 across LinkedIn and Twitter. The "Building in public" series is up 34% engagement from last month.', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, assigneeId: alice.id, createdBy: alice.id, dueDate: null },
  ];

  for (const t of taskRecords) {
    await tx.task.create({
      data: {
        orgId,
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        sourceType: TaskSourceType.MANUAL,
        createdBy: t.createdBy,
        createdByAi: false,
      },
    });
  }

  // ── 11. Document Files ───────────────────────────────────────────────────
  await tx.documentFile.create({
    data: {
      orgId,
      fileId: `file-q3-board-deck-${orgSlug}`,
      title: 'Q3_Board_Presentation_Draft.pdf',
      mimeType: 'application/pdf',
      chunksCount: 3,
    },
  });

  await tx.documentFile.create({
    data: {
      orgId,
      fileId: `file-novatech-case-study-${orgSlug}`,
      title: 'NovaTech_Case_Study_2025.pdf',
      mimeType: 'application/pdf',
      chunksCount: 2,
    },
  });

  return { wikiPages: createdWikiPages };
}

function nextSunday(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  result.setHours(23, 59, 59, 999);
  return result;
}
