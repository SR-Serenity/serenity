import { ChatConversationType, WorkspaceRole, OfficeRoomType, WikiPageVisibility, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

export async function seedOrganizationData(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgSlug: string,
  creatorUser: { id: string; displayName: string }
) {
  // 1. Create dummy users
  const passwordHash = await hash(Math.random().toString(36), 10);

  const alice = await tx.user.create({
    data: {
      email: `alice-${orgSlug}@example.com`,
      displayName: 'Alice (Marketing)',
      passwordHash,
    },
  });

  const bob = await tx.user.create({
    data: {
      email: `bob-${orgSlug}@example.com`,
      displayName: 'Bob (Engineering)',
      passwordHash,
    },
  });

  // 2. Add them to workspace
  await tx.workspaceMember.createMany({
    data: [
      { orgId, userId: alice.id, role: WorkspaceRole.MEMBER },
      { orgId, userId: bob.id, role: WorkspaceRole.MEMBER },
    ],
  });

  // 3. Create Department
  const department = await tx.department.create({
    data: {
      orgId,
      name: 'General',
    },
  });

  // Update members to belong to this department
  await tx.workspaceMember.updateMany({
    where: { orgId, userId: { in: [creatorUser.id, alice.id, bob.id] } },
    data: { departmentId: department.id },
  });

  // 4. Create Public Channels
  const generalChannel = await tx.chatConversation.create({
    data: {
      orgId,
      name: 'general',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
          { userId: bob.id },
        ],
      },
    },
  });

  await tx.chatConversation.create({
    data: {
      orgId,
      name: 'random',
      type: ChatConversationType.PUBLIC_CHANNEL,
      createdById: bob.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
          { userId: bob.id },
        ],
      },
    },
  });

  // 5. Create a DM between Creator and Alice
  // For DM dmKey, we usually sort user ids alphabetically and join them.
  const dmMemberIds = [creatorUser.id, alice.id].sort();
  const dmKey = dmMemberIds.join('_');

  const dmConversation = await tx.chatConversation.create({
    data: {
      orgId,
      type: ChatConversationType.DM,
      dmKey,
      createdById: creatorUser.id,
      members: {
        create: [
          { userId: creatorUser.id },
          { userId: alice.id },
        ],
      },
    },
  });

  // 6. Seed messages
  const now = new Date();

  // In #general
  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: alice.id,
      content: `Welcome to the team, ${creatorUser.displayName}! Excited to have you here.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 5),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 5),
    },
  });

  await tx.chatMessage.create({
    data: {
      conversationId: generalChannel.id,
      authorId: bob.id,
      content: `Welcome ${creatorUser.displayName}! Let me know if you need ` +
        `help setting up your dev environment.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 2),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 2),
    },
  });

  // In DM
  await tx.chatMessage.create({
    data: {
      conversationId: dmConversation.id,
      authorId: alice.id,
      content: `Hey ${creatorUser.displayName}! Did you have a chance to ` +
        `look at the new marketing copy for the landing page?`,
      createdAt: new Date(now.getTime() - 1000 * 60),
      updatedAt: new Date(now.getTime() - 1000 * 60),
    },
  });

  // 7. Create Wiki Page
  await tx.wikiPage.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      title: 'Welcome to Serenity Workspace 🚀',
      visibility: WikiPageVisibility.WORKSPACE,
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
  });

  // 8. Create Office Room
  await tx.officeRoom.create({
    data: {
      orgId,
      createdById: creatorUser.id,
      name: 'Watercooler',
      type: OfficeRoomType.SOCIAL,
      icon: 'coffee',
    },
  });
}
