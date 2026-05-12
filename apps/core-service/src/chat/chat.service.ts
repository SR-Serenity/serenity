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
import type {
  AddReactionDto,
  CompleteAttachmentUploadDto,
  CreateAttachmentUploadIntentDto,
  CreateChannelDto,
  CreateDmDto,
  CreateMessageDto,
  CursorPageDto,
  EditMessageDto,
  ListMessagesDto,
} from './dto/chat.dto';

type AuthContext = {
  userId: string;
  orgId: string;
};
type ConversationCursor = { updatedAt: string; id: string };
type MessageCursor = { createdAt: string; id: string };
type CursorPage<T> = { items: T[]; nextCursor: string | null };

const userSelect = { id: true, email: true, displayName: true };
const reactionUserSelect = { id: true, displayName: true };
const messageInclude = {
  author: { select: userSelect },
  attachments: true,
  reactions: {
    include: { user: { select: reactionUserSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
  replies: { select: { id: true } },
};
type MessageWithInclude = Prisma.ChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ChatEventsService,
    private readonly uploads: UploadsService
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
        members: {
          include: { user: { select: userSelect } },
          orderBy: { joinedAt: 'asc' },
        },
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

    return {
      messages: cursorPage.items
        .reverse()
        .map((message) => this.presentMessage(message)),
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

    return { message };
  }

  async createUploadIntent(
    auth: AuthContext,
    input: CreateAttachmentUploadIntentDto
  ) {
    await this.ensureConversationAccess(auth, input.conversationId);
    const folder = `serenity/${auth.orgId}/conversations/${input.conversationId}`;
    const intent = this.uploads.createSignedUploadIntent({
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
        publicId: intent.publicId,
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
      apiKey: intent.apiKey,
      timestamp: intent.timestamp,
      signature: intent.signature,
      publicId: intent.publicId,
      folder: intent.folder,
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
    if (attachment.publicId !== input.publicId) {
      throw new BadRequestException('Attachment publicId mismatch');
    }

    const completed = await this.prisma.chatAttachment.update({
      where: { id: attachmentId },
      data: {
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        url: input.secureUrl,
        size: input.bytes,
        provider: UploadProvider.CLOUDINARY,
        metadata: {
          ...(typeof attachment.metadata === 'object' &&
          attachment.metadata !== null &&
          !Array.isArray(attachment.metadata)
            ? attachment.metadata
            : {}),
          publicId: input.publicId,
          resourceType: input.resourceType,
          format: input.format,
          width: input.width,
          height: input.height,
          bytes: input.bytes,
        },
      },
    });

    return { attachment: completed };
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
