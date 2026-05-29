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

This is your central hub for collaboration. Serenity brings together:
- **Chat:** Talk to your team in channels or direct messages.
- **Wiki:** Document your processes and notes.
- **Calendar:** Schedule events and sync with Google Calendar.
- **Office:** Jump into a virtual room for audio/video huddles.

### Try out the Serenity AI Assistant ✨

Type \`/\` in any chat box or right here in the wiki editor to summon your AI assistant.
It can read the context of what you're working on and suggest edits, translations, or next steps!
`,
    },
    {
      title: 'Code Styling and Linting Guidelines',
      icon: 'code',
      contentMarkdown: `# Code Styling Guidelines
This page is last updated by David.
We use eslint and prettier configurations for ensuring clean styling formatting across our repositories.
Rules:
- 2 spaces indentation.
- Double quotes.
`,
    },
    {
      title: 'Workspace Security Policy and Best Practices',
      icon: 'shield',
      contentMarkdown: `# Workspace Security Policy and Best Practices
Under Guidelines category.
Keep passwords secure. Ensure that the server is updated with the latest security patches.
`,
    },
    {
      title: 'Remote Working Guidelines',
      icon: 'home',
      contentMarkdown: `# Guidelines
Remote work allows flexible scheduling. Standups occur daily at 10 AM. Timesheets are due weekly.
`,
    },
    {
      title: 'Team Standards',
      icon: 'users',
      contentMarkdown: `# Standards
We strive for excellence.
Guidelines:
- Be respectful.
- Document your code.
- Communicate changes early.
`,
    },
    {
      title: 'Changelog',
      icon: 'list',
      contentMarkdown: `v1.2.0 is out. added evaluation metrics and fixed some DB memory leaks.`,
    },
    {
      title: 'Setup Guide',
      icon: 'book',
      contentMarkdown: `# Setup Instructions
Run \`npm install\` to get started.
`,
    },
    {
      title: 'Onboarding',
      icon: 'user-plus',
      contentMarkdown: `This is the onboarding guide. Complete the checklist below to begin working.`,
    },
    {
      title: 'Goals Draft',
      icon: 'target',
      contentMarkdown: `Goals: Goal 1, Goal 2.`,
    },
    {
      title: 'Developer Manual',
      icon: 'file-text',
      contentMarkdown: `# Dev Manual
this manual covers prerequisites and introduction.
`,
    },
    {
      title: 'Release Procedures',
      icon: 'rocket',
      contentMarkdown: `Hey, we gotta get this deploy list done by Friday, ok guys?`,
    },
    {
      title: 'API Guidelines',
      icon: 'cpu',
      contentMarkdown: `# API Specs
We use REST APIs.
`,
    },
    {
      title: 'Maintenance Draft',
      icon: 'wrench',
      contentMarkdown: `we need to secure that server is update with the latest security patch.`,
    },
    {
      title: 'Deployment Instructions',
      icon: 'server',
      contentMarkdown: `First compile files, then compile docker assets, push it to docker registry and run docker stack deploy restart.`,
    },
    {
      title: 'Code Review Policy',
      icon: 'clipboard-list',
      contentMarkdown: `# Code Review`,
    },
    {
      title: 'Security Guidelines',
      icon: 'lock',
      contentMarkdown: `# Security
Keep passwords secure.
`,
    },
    {
      title: 'Milestones',
      icon: 'calendar',
      contentMarkdown: `Kickoff is June 1st owned by Huy, Demo is July 15th owned by David.`,
    },
    {
      title: 'Getting Started',
      icon: 'play',
      contentMarkdown: `Run npm run dev, then open browser on localhost.`,
    },
    {
      title: 'Troubleshooting Guide',
      icon: 'alert-triangle',
      contentMarkdown: `First check logs, then double check DB passwords, then restart redis cache.`,
    },
    {
      title: 'Notification Engine',
      icon: 'bell',
      contentMarkdown: `The notification system is designed to provide immediate notifications to clients. It triggers mail sending processes as well as real-time messaging updates.`,
    },
    {
      title: 'Architecture Overview',
      icon: 'layers',
      contentMarkdown: `# Architecture`,
    },
    {
      title: 'Webhook Processing',
      icon: 'activity',
      contentMarkdown: `Basically, our system does some pretty cool magic processing on webhooks using a fast Redis queue.`,
    },
    {
      title: 'Guidelines Summary',
      icon: 'check-square',
      contentMarkdown: `standup are daily and you must attend. make pull request. write docs.`,
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
