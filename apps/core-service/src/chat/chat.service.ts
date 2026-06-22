import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ChatAttachmentKind,
  ChatAttachmentUploadStatus,
  ChatConversationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';
import { UploadProvider } from '../uploads/config/enums/upload-provider.enum';
import { UploadsService } from '../uploads/uploads.service';
import { ChatEventsService } from './chat-events.service';
import { AutomationEngineService } from '../automation/automation-engine.service';
import type {
  AddReactionDto,
  AddConversationMembersDto,
  CompleteAttachmentUploadDto,
  CreateAttachmentUploadIntentDto,
  CreateChannelDto,
  CreateDmDto,
  CreateMessageDto,
  CursorPageDto,
  EditMessageDto,
  ListConversationAssetsDto,
  ListMessagesDto,
} from './dto/chat.dto';

type AuthContext = {
  userId: string;
  orgId: string;
};
type ConversationCursor = { updatedAt: string; id: string };
type MessageCursor = { createdAt: string; id: string };
type AttachmentCursor = { createdAt: string; id: string };
type CursorPage<T> = { items: T[]; nextCursor: string | null };

const userSelect = { id: true, email: true, displayName: true };
const reactionUserSelect = { id: true, displayName: true };
const messageInclude = {
  author: { select: userSelect },
  replyTo: {
    select: {
      id: true,
      authorId: true,
      content: true,
      unsentAt: true,
      author: { select: userSelect },
    },
  },
  attachments: true,
  reactions: {
    include: { user: { select: reactionUserSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
  replies: { select: { id: true } },
};
const conversationInclude = {
  members: {
    include: { user: { select: userSelect } },
    orderBy: { joinedAt: 'asc' as const },
  },
};
type MessageWithInclude = Prisma.ChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ChatEventsService,
    private readonly uploads: UploadsService,
    private readonly automationEngine: AutomationEngineService,
  ) {}

  async listConversations(auth: AuthContext, page?: CursorPageDto) {
    await this.ensureWorkspaceMember(auth.orgId, auth.userId);
    const limit = page?.limit ?? 50;
    const cursor = this.decodeCursor<ConversationCursor>(page?.cursor);
    const baseWhere: Prisma.ChatConversationWhereInput = {
      orgId: auth.orgId,
      OR: [
        { type: ChatConversationType.PUBLIC_CHANNEL },
        { members: { some: { userId: auth.userId } } },
      ],
    };

    const conversations = await this.prisma.chatConversation.findMany({
      where: cursor
        ? {
          AND: [
            baseWhere,
            {
              OR: [
                { updatedAt: { lt: new Date(cursor.updatedAt) } },
                {
                  updatedAt: new Date(cursor.updatedAt),
                  id: { lt: cursor.id },
                },
              ],
            },
          ],
        }
        : baseWhere,
      include: {
        ...conversationInclude,
        messages: {
          take: 1,
          where: {
            visibilities: { none: { userId: auth.userId } },
          },
          orderBy: { createdAt: 'desc' },
          include: messageInclude,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const cursorPage = this.toCursorPage(conversations, limit, (conversation) => ({
      updatedAt: conversation.updatedAt.toISOString(),
      id: conversation.id,
    }));

    return {
      conversations: cursorPage.items.map(({ messages, ...conversation }) => ({
        ...conversation,
        lastMessage: messages[0] ? this.presentMessage(messages[0]) : null,
      })),
      nextCursor: cursorPage.nextCursor,
    };
  }

  async createChannel(auth: AuthContext, input: CreateChannelDto) {
    await this.ensureWorkspaceMember(auth.orgId, auth.userId);
    const memberIds = await this.filterOrgMembers(auth.orgId, [
      auth.userId,
      ...(input.memberIds ?? []),
    ]);
    const slug = await this.uniqueSlug(auth.orgId, input.name);

    return this.prisma.chatConversation.create({
      data: {
        orgId: auth.orgId,
        type: input.type,
        name: input.name.trim(),
        slug,
        createdById: auth.userId,
        members: {
          createMany: {
            data: memberIds.map((userId) => ({ userId })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        members: {
          include: { user: { select: userSelect } },
        },
      },
    });
  }

  async createDm(auth: AuthContext, input: CreateDmDto) {
    await this.ensureWorkspaceMember(auth.orgId, auth.userId);
    if (input.memberIds.length !== 1 || input.memberIds[0] === auth.userId) {
      throw new BadRequestException(
        'A DM must target exactly one other workspace member'
      );
    }

    const memberIds = await this.filterOrgMembers(auth.orgId, [
      auth.userId,
      input.memberIds[0],
    ]);

    if (memberIds.length !== 2) {
      throw new BadRequestException('A DM needs exactly two workspace members');
    }

    const dmKey = this.dmKey(memberIds);

    return this.prisma.chatConversation.upsert({
      where: {
        orgId_dmKey: {
          orgId: auth.orgId,
          dmKey,
        },
      },
      update: {},
      create: {
        orgId: auth.orgId,
        type: ChatConversationType.DM,
        dmKey,
        createdById: auth.userId,
        members: {
          createMany: {
            data: memberIds.map((userId) => ({ userId })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        members: {
          include: { user: { select: userSelect } },
        },
      },
    });
  }

  async listMessages(
    auth: AuthContext,
    conversationId: string,
    parentId?: string,
    page?: ListMessagesDto
  ) {
    await this.ensureConversationAccess(auth, conversationId);
    const limit = page?.limit ?? 50;
    const cursor = this.decodeCursor<MessageCursor>(page?.cursor);
    const baseWhere: Prisma.ChatMessageWhereInput = {
      conversationId,
      parentId: parentId ?? null,
      visibilities: { none: { userId: auth.userId } },
    };

    const messages = await this.prisma.chatMessage.findMany({
      where: cursor
        ? {
          AND: [
            baseWhere,
            {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            },
          ],
        }
        : baseWhere,
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const cursorPage = this.toCursorPage(messages, limit, (message) => ({
      createdAt: message.createdAt.toISOString(),
      id: message.id,
    }));

    const presented = cursorPage.items
      .reverse()
      .map((message) => this.presentMessage(message));
    const resolved = await this.resolveMessagesAttachmentUrls(presented);

    return {
      messages: resolved,
      nextCursor: cursorPage.nextCursor,
    };
  }

  async createMessage(
    auth: AuthContext,
    conversationId: string,
    input: CreateMessageDto
  ) {
    const conversation = await this.ensureConversationAccess(
      auth,
      conversationId
    );
    const content = input.content?.trim() ?? '';
    const attachmentIds = Array.from(new Set(input.attachmentIds ?? []));

    if (!content && attachmentIds.length === 0) {
      throw new BadRequestException(
        'Message content or attachment is required'
      );
    }

    if (input.parentId) {
      const parent = await this.prisma.chatMessage.findFirst({
        where: { id: input.parentId, conversationId, parentId: null },
      });
      if (!parent) {
        throw new NotFoundException('Thread parent message not found');
      }
    }

    if (input.replyToId) {
      const replyTo = await this.prisma.chatMessage.findFirst({
        where: { id: input.replyToId, conversationId },
      });
      if (!replyTo) {
        throw new NotFoundException('Reply target message not found');
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      if (attachmentIds.length > 0) {
        const attachments = await tx.chatAttachment.findMany({
          where: {
            id: { in: attachmentIds },
            conversationId,
            uploadedById: auth.userId,
            uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
            messageId: null,
          },
          select: { id: true },
        });
        if (attachments.length !== attachmentIds.length) {
          throw new BadRequestException(
            'All attachments must be completed uploads for this conversation'
          );
        }
      }

      const created = await tx.chatMessage.create({
        data: {
          conversationId,
          authorId: auth.userId,
          parentId: input.parentId,
          replyToId: input.replyToId,
          content,
        },
      });

      if (attachmentIds.length > 0) {
        const linked = await tx.chatAttachment.updateMany({
          where: {
            id: { in: attachmentIds },
            conversationId,
            uploadedById: auth.userId,
            uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
            messageId: null,
          },
          data: { messageId: created.id },
        });
        if (linked.count !== attachmentIds.length) {
          throw new BadRequestException(
            'All attachments must be completed uploads for this conversation'
          );
        }
      }

      const createdWithRelations = await tx.chatMessage.findUnique({
        where: { id: created.id },
        include: messageInclude,
      });
      if (!createdWithRelations) {
        throw new NotFoundException('Message not found');
      }
      return createdWithRelations;
    });

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await this.events.publish({
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      orgId: auth.orgId,
      conversationId,
      payload: message,
    });

    if (message.content) {
      void this.automationEngine.runMessageKeyword(auth.orgId, {
        conversationId,
        content: message.content,
        authorId: auth.userId,
      });
    }

    if (message.content) {
      const copilotMatch = message.content.match(/@copilot\s+([\s\S]+)/i);
      if (copilotMatch) {
        void this.postCopilotReply(auth, conversationId, copilotMatch[1].trim());
      }
    }

    return { message };
  }

  private async postCopilotReply(
    auth: AuthContext,
    conversationId: string,
    instruction: string,
  ): Promise<void> {
    const aiBaseUrl =
      process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';

    const recent = await this.prisma.chatMessage.findMany({
      where: { conversationId, unsentAt: null, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { author: { select: { displayName: true } } },
    });

    const priorMessages = recent
      .reverse()
      .filter((m) => m.content)
      .map((m) => `${m.author.displayName}: ${m.content}`);

    const prompt = [
      'You are Copilot replying inside a group chat conversation.',
      'Use the recent conversation context when it helps, and keep the reply concise.',
      '',
      'Recent conversation:',
      priorMessages.length ? priorMessages.join('\n') : '(no prior messages)',
      '',
      `User request: ${instruction}`,
    ].join('\n');

    const internalToken = process.env.AI_INTERNAL_API_TOKEN;
    try {
      const res = await fetch(`${aiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalToken ? { 'x-internal-api-token': internalToken } : {}),
        },
        body: JSON.stringify({
          sessionId: `copilot-${conversationId}`,
          message: prompt,
          authContext: { orgId: auth.orgId, userId: auth.userId },
          context: {
            conversationId,
            entrypoint: 'chat_copilot_mention',
          },
        }),
      });

      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { answer?: string; proposedActions?: unknown[] };
      const replyContent = (data.answer ?? '').trim();
      if (!replyContent) {
        return;
      }
      const proposedActions = Array.isArray(data.proposedActions) && data.proposedActions.length > 0
        ? data.proposedActions
        : undefined;

      const botUser = await this.prisma.workspaceMember.findFirst({
        where: { orgId: auth.orgId, role: 'OWNER' },
        select: { userId: true },
      });
      const botAuthorId = botUser?.userId ?? auth.userId;

      const botMessage = await this.prisma.chatMessage.create({
        data: {
          conversationId,
          authorId: botAuthorId,
          content: replyContent,
          isCopilot: true,
          proposedActions,
        },
        include: messageInclude,
      });

      await this.events.publish({
        event: ChatRealtimeEvent.MESSAGE_CREATED,
        orgId: auth.orgId,
        conversationId,
        payload: botMessage,
      });
    } catch {
      // silently fail — don't break the original message flow
    }
  }

  async addConversationMembers(
    auth: AuthContext,
    conversationId: string,
    input: AddConversationMembersDto
  ) {
    const conversation = await this.ensureConversationAccess(auth, conversationId);
    if (conversation.type === ChatConversationType.DM) {
      throw new BadRequestException('Cannot add members to a direct message');
    }

    const memberIds = await this.filterOrgMembers(auth.orgId, input.memberIds);
    if (memberIds.length > 0) {
      await this.prisma.chatConversationMember.createMany({
        data: memberIds.map((userId) => ({ conversationId, userId })),
        skipDuplicates: true,
      });
    }

    const updated = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, orgId: auth.orgId },
      include: conversationInclude,
    });
    if (!updated) {
      throw new NotFoundException('Conversation not found');
    }
    return updated;
  }

  async listConversationAssets(
    auth: AuthContext,
    conversationId: string,
    page?: ListConversationAssetsDto
  ) {
    await this.ensureConversationAccess(auth, conversationId);
    const limit = page?.limit ?? 50;
    const cursor = this.decodeCursor<AttachmentCursor>(page?.cursor);
    const baseWhere: Prisma.ChatAttachmentWhereInput = {
      conversationId,
      orgId: auth.orgId,
      uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
      messageId: { not: null },
      ...(page?.kind === 'DOC' ? this.documentAttachmentWhere() : {}),
    };

    const attachments = await this.prisma.chatAttachment.findMany({
      where: cursor
        ? {
          AND: [
            baseWhere,
            {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            },
          ],
        }
        : baseWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const cursorPage = this.toCursorPage(attachments, limit, (attachment) => ({
      createdAt: attachment.createdAt.toISOString(),
      id: attachment.id,
    }));

    const resolved = await this.uploads.resolveAttachmentUrls(cursorPage.items);

    return {
      attachments: resolved,
      nextCursor: cursorPage.nextCursor,
    };
  }

  async createUploadIntent(
    auth: AuthContext,
    input: CreateAttachmentUploadIntentDto
  ) {
    await this.ensureConversationAccess(auth, input.conversationId);
    const folder = `serenity/${auth.orgId}/conversations/${input.conversationId}`;
    const intent = await this.uploads.createSignedUploadIntent({
      filename: input.filename,
      contentType: input.contentType,
      size: input.size,
      folder,
    });

    await this.prisma.chatAttachment.create({
      data: {
        id: intent.attachmentId,
        orgId: auth.orgId,
        conversationId: input.conversationId,
        uploadedById: auth.userId,
        kind:
          input.contentType === 'image/gif'
            ? ChatAttachmentKind.GIF
            : ChatAttachmentKind.FILE,
        uploadStatus: ChatAttachmentUploadStatus.PENDING,
        publicId: intent.objectPath,
        name: input.filename,
        mimeType: input.contentType,
        size: input.size,
        provider: intent.provider,
        metadata: { contentType: input.contentType },
      },
    });

    return {
      attachmentId: intent.attachmentId,
      uploadUrl: intent.uploadUrl,
      objectPath: intent.objectPath,
    };
  }

  async completeAttachmentUpload(
    auth: AuthContext,
    attachmentId: string,
    input: CompleteAttachmentUploadDto
  ) {
    const attachment = await this.prisma.chatAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    await this.ensureConversationAccess(auth, attachment.conversationId);
    if (attachment.uploadedById !== auth.userId) {
      throw new ForbiddenException('Attachment upload access denied');
    }
    if (attachment.publicId !== input.objectPath) {
      throw new BadRequestException('Attachment objectPath mismatch');
    }

    const completed = await this.prisma.chatAttachment.update({
      where: { id: attachmentId },
      data: {
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        provider: UploadProvider.GCS,
        metadata: {
          ...(typeof attachment.metadata === 'object' &&
          attachment.metadata !== null &&
          !Array.isArray(attachment.metadata)
            ? attachment.metadata
            : {}),
          objectPath: input.objectPath,
        },
      },
    });

    const [withUrl] = await this.uploads.resolveAttachmentUrls([completed]);
    return { attachment: withUrl };
  }

  async editMessage(
    auth: AuthContext,
    messageId: string,
    input: EditMessageDto
  ) {
    const message = await this.findAccessibleMessage(auth, messageId);
    if (message.authorId !== auth.userId) {
      throw new ForbiddenException(
        'Only the message author can edit this message'
      );
    }
    if (message.unsentAt) {
      throw new BadRequestException('Unsent messages cannot be edited');
    }

    const content = input.content.trim();
    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        editedAt: new Date(),
      },
      include: messageInclude,
    });
    const payload = this.presentMessage(updated);

    await this.events.publish({
      event: ChatRealtimeEvent.MESSAGE_EDITED,
      orgId: auth.orgId,
      conversationId: message.conversationId,
      payload,
    });

    return { message: payload };
  }

  async unsendMessage(auth: AuthContext, messageId: string) {
    const message = await this.findAccessibleMessage(auth, messageId);
    if (message.authorId !== auth.userId) {
      throw new ForbiddenException(
        'Only the message author can unsend this message'
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.chatAttachment.deleteMany({ where: { messageId } });
      await tx.chatReaction.deleteMany({ where: { messageId } });
      return tx.chatMessage.update({
        where: { id: messageId },
        data: {
          content: '',
          unsentAt: message.unsentAt ?? new Date(),
        },
        include: messageInclude,
      });
    });
    const payload = this.presentMessage(updated);

    await this.events.publish({
      event: ChatRealtimeEvent.MESSAGE_UNSENT,
      orgId: auth.orgId,
      conversationId: message.conversationId,
      payload,
    });

    return { message: payload };
  }

  async deleteMessageForMe(auth: AuthContext, messageId: string) {
    await this.findAccessibleMessage(auth, messageId);
    await this.prisma.chatMessageVisibility.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: auth.userId,
        },
      },
      update: { deletedAt: new Date() },
      create: {
        messageId,
        userId: auth.userId,
      },
    });

    return { success: true };
  }

  async addReaction(
    auth: AuthContext,
    messageId: string,
    input: AddReactionDto
  ) {
    const message = await this.findAccessibleMessage(auth, messageId);
    if (message.unsentAt) {
      throw new BadRequestException('Cannot react to an unsent message');
    }
    const reaction = await this.prisma.chatReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: auth.userId,
          emoji: input.emoji,
        },
      },
      update: {},
      create: {
        messageId,
        userId: auth.userId,
        emoji: input.emoji,
      },
      include: {
        user: { select: reactionUserSelect },
      },
    });

    await this.events.publish({
      event: ChatRealtimeEvent.REACTION_ADDED,
      orgId: auth.orgId,
      conversationId: message.conversationId,
      payload: { messageId, reaction },
    });

    return { reaction };
  }

  async removeReaction(auth: AuthContext, messageId: string, emoji: string) {
    const message = await this.findAccessibleMessage(auth, messageId);
    await this.prisma.chatReaction.deleteMany({
      where: { messageId, userId: auth.userId, emoji },
    });

    await this.events.publish({
      event: ChatRealtimeEvent.REACTION_REMOVED,
      orgId: auth.orgId,
      conversationId: message.conversationId,
      payload: { messageId, userId: auth.userId, emoji },
    });

    return { success: true };
  }

  private async ensureWorkspaceMember(orgId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
    });
    if (!membership) {
      throw new UnauthorizedException('Workspace access denied');
    }
    return membership;
  }

  private async ensureConversationAccess(
    auth: AuthContext,
    conversationId: string
  ) {
    await this.ensureWorkspaceMember(auth.orgId, auth.userId);
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, orgId: auth.orgId },
      include: {
        members: { where: { userId: auth.userId } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const publicChannel =
      conversation.type === ChatConversationType.PUBLIC_CHANNEL;
    if (!publicChannel && conversation.members.length === 0) {
      throw new ForbiddenException('Conversation access denied');
    }

    return conversation;
  }

  private async findAccessibleMessage(auth: AuthContext, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        authorId: true,
        conversationId: true,
        unsentAt: true,
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.ensureConversationAccess(auth, message.conversationId);
    return message;
  }

  private async filterOrgMembers(orgId: string, userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { orgId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const foundIds = memberships.map((member) => member.userId);

    if (foundIds.length !== uniqueIds.length) {
      throw new BadRequestException(
        'All chat members must belong to the workspace'
      );
    }

    return foundIds;
  }

  private documentAttachmentWhere(): Prisma.ChatAttachmentWhereInput {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/rtf',
    ];
    const extensions = [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.txt',
      '.csv',
      '.md',
      '.rtf',
    ];

    return {
      OR: [
        { mimeType: { in: documentMimeTypes } },
        { mimeType: { startsWith: 'text/' } },
        ...extensions.map((extension) => ({
          name: { endsWith: extension, mode: Prisma.QueryMode.insensitive },
        })),
      ],
    };
  }

  private dmKey(memberIds: string[]) {
    return [...memberIds].sort().join(':');
  }

  private async uniqueSlug(orgId: string, name: string) {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'channel';

    let slug = base;
    let suffix = 1;
    while (
      await this.prisma.chatConversation.findUnique({
        where: { orgId_slug: { orgId, slug } },
      })
    ) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  private presentMessage(message: MessageWithInclude): MessageWithInclude {
    if (!message.unsentAt) {
      return message;
    }
    return {
      ...message,
      content: '',
      attachments: [],
      reactions: [],
    };
  }

  private async resolveMessagesAttachmentUrls(
    messages: MessageWithInclude[],
  ): Promise<MessageWithInclude[]> {
    const allAttachments = messages.flatMap((m) => m.attachments);
    if (allAttachments.length === 0) {
      return messages;
    }
    const resolved = await this.uploads.resolveAttachmentUrls(allAttachments);
    const urlMap = new Map(resolved.map((a) => [a.id, a.url]));
    return messages.map((m) => ({
      ...m,
      attachments: m.attachments.map((a) => ({
        ...a,
        url: urlMap.get(a.id) ?? a.url,
      })),
    }));
  }

  private decodeCursor<T>(value?: string): T | null {
    if (!value) {
      return null;
    }

    try {
      const json = Buffer.from(value, 'base64').toString('utf8');
      return JSON.parse(json) as T;
    } catch {
      throw new BadRequestException('Invalid pagination cursor');
    }
  }

  private encodeCursor<T>(value: T): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
  }

  private toCursorPage<T>(
    items: T[],
    limit: number,
    cursorFromItem: (item: T) => Record<string, string>
  ): CursorPage<T> {
    if (items.length <= limit) {
      return { items, nextCursor: null };
    }

    const pageItems = items.slice(0, limit);
    const tail = pageItems[pageItems.length - 1];

    return {
      items: pageItems,
      nextCursor: this.encodeCursor(cursorFromItem(tail)),
    };
  }
}
