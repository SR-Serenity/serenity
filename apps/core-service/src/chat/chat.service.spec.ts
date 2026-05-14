import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  ChatAttachmentKind,
  ChatAttachmentUploadStatus,
  ChatConversationType,
} from '@prisma/client';
import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';
import { UploadProvider } from '../uploads/config/enums/upload-provider.enum';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  const auth = { userId: 'user_1', orgId: 'org_1' };
  let prisma: any;
  let tx: any;
  let events: { publish: jest.Mock };
  let uploads: { createSignedUploadIntent: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    tx = {
      chatAttachment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      chatReaction: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      chatMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma = {
      workspaceMember: {
        findFirst: jest.fn().mockResolvedValue({ id: 'member_1' }),
        findMany: jest.fn().mockResolvedValue([
          { userId: 'user_1' },
          { userId: 'user_2' },
        ]),
      },
      chatConversation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conversation_1',
          type: ChatConversationType.DM,
          members: [{ userId: 'user_1' }],
        }),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'dm_1' }),
        update: jest.fn().mockResolvedValue({ id: 'conversation_1' }),
      },
      chatConversationMember: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      chatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'message_1',
          authorId: 'user_1',
          conversationId: 'conversation_1',
          unsentAt: null,
        }),
        update: jest.fn(),
      },
      chatAttachment: {
        create: jest.fn().mockResolvedValue({ id: 'attachment_1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      chatMessageVisibility: {
        upsert: jest.fn().mockResolvedValue({ id: 'visibility_1' }),
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    uploads = {
      createSignedUploadIntent: jest.fn().mockReturnValue({
        provider: UploadProvider.CLOUDINARY,
        attachmentId: 'attachment_1',
        uploadUrl: 'https://api.cloudinary.com/v1_1/cloud/auto/upload',
        apiKey: 'key',
        timestamp: 1710000000,
        signature: 'signature',
        publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
        folder: 'serenity/org_1/conversations/conversation_1',
      }),
    };
    service = new ChatService(prisma, events as never, uploads as never);
    jest.clearAllMocks();
  });

  it('creates or reuses a strict 1:1 DM by sorted dmKey', async () => {
    await service.createDm(auth, { memberIds: ['user_2'] });

    expect(prisma.chatConversation.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId_dmKey: { orgId: 'org_1', dmKey: 'user_1:user_2' } },
      create: expect.objectContaining({
        dmKey: 'user_1:user_2',
        type: ChatConversationType.DM,
      }),
    }));
  });

  it('rejects DM requests that are not exactly 1:1 with another member', async () => {
    await expect(service.createDm(auth, { memberIds: [] }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createDm(auth, { memberIds: ['user_1'] }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createDm(auth, { memberIds: ['user_2', 'user_3'] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds workspace members to group conversations and dedupes through createMany', async () => {
    const updatedConversation = {
      id: 'conversation_1',
      type: ChatConversationType.PUBLIC_CHANNEL,
      members: [
        {
          id: 'member_1',
          userId: 'user_1',
          user: { id: 'user_1', displayName: 'User One' },
        },
        {
          id: 'member_2',
          userId: 'user_2',
          user: { id: 'user_2', displayName: 'User Two' },
        },
      ],
    };
    prisma.chatConversation.findFirst
      .mockResolvedValueOnce({
        id: 'conversation_1',
        type: ChatConversationType.PUBLIC_CHANNEL,
        members: [{ userId: 'user_1' }],
      })
      .mockResolvedValueOnce(updatedConversation);
    prisma.workspaceMember.findMany.mockResolvedValueOnce([{ userId: 'user_2' }]);

    await expect(service.addConversationMembers(auth, 'conversation_1', {
      memberIds: ['user_2', 'user_2'],
    })).resolves.toBe(updatedConversation);

    expect(prisma.chatConversationMember.createMany).toHaveBeenCalledWith({
      data: [{ conversationId: 'conversation_1', userId: 'user_2' }],
      skipDuplicates: true,
    });
  });

  it('rejects adding members to DMs and rejects non-workspace members', async () => {
    await expect(service.addConversationMembers(auth, 'conversation_1', {
      memberIds: ['user_2'],
    })).rejects.toBeInstanceOf(BadRequestException);

    prisma.chatConversation.findFirst.mockResolvedValueOnce({
      id: 'conversation_1',
      type: ChatConversationType.PUBLIC_CHANNEL,
      members: [{ userId: 'user_1' }],
    });
    prisma.workspaceMember.findMany.mockResolvedValueOnce([]);

    await expect(service.addConversationMembers(auth, 'conversation_1', {
      memberIds: ['user_2'],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters messages deleted for current user', async () => {
    await service.listMessages(auth, 'conversation_1');

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        visibilities: { none: { userId: 'user_1' } },
      }),
    }));
  });

  it('lists conversation assets with doc filters and access checks', async () => {
    const attachment = {
      id: 'attachment_1',
      conversationId: 'conversation_1',
      orgId: 'org_1',
      name: 'brief.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date(),
    };
    prisma.chatAttachment.findMany.mockResolvedValue([attachment]);

    await expect(service.listConversationAssets(auth, 'conversation_1', {
      kind: 'DOC',
      limit: 50,
    })).resolves.toEqual({
      attachments: [attachment],
      nextCursor: null,
    });

    expect(prisma.chatAttachment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        conversationId: 'conversation_1',
        orgId: 'org_1',
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        messageId: { not: null },
        OR: expect.any(Array),
      }),
    }));
  });

  it('edits author messages and publishes message.edited', async () => {
    const updated = messageFixture({ content: 'updated', editedAt: new Date() });
    prisma.chatMessage.update.mockResolvedValue(updated);

    await expect(service.editMessage(auth, 'message_1', { content: ' updated ' }))
      .resolves.toEqual({ message: updated });

    expect(prisma.chatMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ content: 'updated', editedAt: expect.any(Date) }),
    }));
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: ChatRealtimeEvent.MESSAGE_EDITED,
      payload: updated,
    }));
  });

  it('rejects edits from non-authors and unsent messages', async () => {
    prisma.chatMessage.findUnique.mockResolvedValueOnce({
      id: 'message_1',
      authorId: 'user_2',
      conversationId: 'conversation_1',
      unsentAt: null,
    });
    await expect(service.editMessage(auth, 'message_1', { content: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);

    prisma.chatMessage.findUnique.mockResolvedValueOnce({
      id: 'message_1',
      authorId: 'user_1',
      conversationId: 'conversation_1',
      unsentAt: new Date(),
    });
    await expect(service.editMessage(auth, 'message_1', { content: 'x' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('unsends author messages and returns cleared message payload', async () => {
    const unsentAt = new Date();
    tx.chatMessage.update.mockResolvedValue(messageFixture({
      content: '',
      unsentAt,
      attachments: [{ id: 'attachment_1' }],
      reactions: [{ id: 'reaction_1' }],
    }));

    const result = await service.unsendMessage(auth, 'message_1');

    expect(result.message).toMatchObject({
      content: '',
      attachments: [],
      reactions: [],
      unsentAt,
    });
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: ChatRealtimeEvent.MESSAGE_UNSENT,
      payload: expect.objectContaining({ unsentAt }),
    }));
  });

  it('deletes a message only for the current user', async () => {
    await service.deleteMessageForMe(auth, 'message_1');

    expect(prisma.chatMessageVisibility.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        messageId_userId: {
          messageId: 'message_1',
          userId: 'user_1',
        },
      },
    }));
  });

  it('creates signed Cloudinary upload intents', async () => {
    const result = await service.createUploadIntent(auth, {
      filename: 'file.png',
      contentType: 'image/png',
      size: 4,
      conversationId: 'conversation_1',
    });

    expect(result).toEqual({
      attachmentId: 'attachment_1',
      uploadUrl: 'https://api.cloudinary.com/v1_1/cloud/auto/upload',
      apiKey: 'key',
      timestamp: 1710000000,
      signature: 'signature',
      publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
      folder: 'serenity/org_1/conversations/conversation_1',
    });
    expect(uploads.createSignedUploadIntent).toHaveBeenCalledWith({
      filename: 'file.png',
      contentType: 'image/png',
      size: 4,
      folder: 'serenity/org_1/conversations/conversation_1',
    });
    expect(prisma.chatAttachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: result.attachmentId,
        orgId: 'org_1',
        conversationId: 'conversation_1',
        uploadedById: 'user_1',
        kind: ChatAttachmentKind.FILE,
        uploadStatus: ChatAttachmentUploadStatus.PENDING,
        publicId: result.publicId,
        provider: UploadProvider.CLOUDINARY,
      }),
    });
  });

  it('rejects upload intents for non-members', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(service.createUploadIntent(auth, {
      filename: 'file.png',
      contentType: 'image/png',
      size: 4,
      conversationId: 'conversation_1',
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('completes attachments only for the upload owner', async () => {
    prisma.chatAttachment.findUnique.mockResolvedValue({
      id: 'attachment_1',
      conversationId: 'conversation_1',
      uploadedById: 'user_1',
      publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
      metadata: { contentType: 'image/png' },
    });
    prisma.chatAttachment.update.mockResolvedValue({
      id: 'attachment_1',
      uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
    });

    const result = await service.completeAttachmentUpload(auth, 'attachment_1', {
      publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
      secureUrl: 'https://res.cloudinary.com/file.png',
      bytes: 4,
      resourceType: 'image',
      format: 'png',
      width: 100,
      height: 80,
    });

    expect(result.attachment).toMatchObject({
      id: 'attachment_1',
      uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
    });
    expect(prisma.chatAttachment.update).toHaveBeenCalledWith({
      where: { id: 'attachment_1' },
      data: expect.objectContaining({
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        url: 'https://res.cloudinary.com/file.png',
        size: 4,
        provider: 'cloudinary',
        metadata: expect.objectContaining({
          publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
          resourceType: 'image',
          format: 'png',
          width: 100,
          height: 80,
          bytes: 4,
        }),
      }),
    });
  });

  it('rejects attachment completion from non-owners and mismatched publicId', async () => {
    prisma.chatAttachment.findUnique.mockResolvedValueOnce({
      id: 'attachment_1',
      conversationId: 'conversation_1',
      uploadedById: 'user_2',
      publicId: 'public_1',
      metadata: {},
    });
    await expect(service.completeAttachmentUpload(auth, 'attachment_1', {
      publicId: 'public_1',
      secureUrl: 'https://res.cloudinary.com/file.png',
      bytes: 4,
      resourceType: 'image',
    })).rejects.toBeInstanceOf(ForbiddenException);

    prisma.chatAttachment.findUnique.mockResolvedValueOnce({
      id: 'attachment_1',
      conversationId: 'conversation_1',
      uploadedById: 'user_1',
      publicId: 'public_1',
      metadata: {},
    });
    await expect(service.completeAttachmentUpload(auth, 'attachment_1', {
      publicId: 'public_2',
      secureUrl: 'https://res.cloudinary.com/file.png',
      bytes: 4,
      resourceType: 'image',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('links only completed owned attachments when creating messages', async () => {
    const created = messageFixture({
      id: 'message_2',
      attachments: [{ id: 'attachment_1' }],
    });
    tx.chatAttachment.findMany.mockResolvedValue([{ id: 'attachment_1' }]);
    tx.chatAttachment.updateMany.mockResolvedValue({ count: 1 });
    tx.chatMessage.create.mockResolvedValue({ id: 'message_2' });
    tx.chatMessage.findUnique.mockResolvedValue(created);

    await expect(service.createMessage(auth, 'conversation_1', {
      content: 'with file',
      attachmentIds: ['attachment_1'],
    })).resolves.toEqual({ message: created });

    expect(tx.chatAttachment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ['attachment_1'] },
        conversationId: 'conversation_1',
        uploadedById: 'user_1',
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        messageId: null,
      },
      select: { id: true },
    }));
    expect(tx.chatAttachment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['attachment_1'] },
        conversationId: 'conversation_1',
        uploadedById: 'user_1',
        uploadStatus: ChatAttachmentUploadStatus.COMPLETED,
        messageId: null,
      }),
      data: { messageId: 'message_2' },
    }));
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      payload: created,
    }));
  });

  it('rejects pending, reused, foreign, or wrong-conversation attachments', async () => {
    tx.chatAttachment.findMany.mockResolvedValue([]);

    await expect(service.createMessage(auth, 'conversation_1', {
      content: 'with bad file',
      attachmentIds: ['attachment_1'],
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

function messageFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'message_1',
    conversationId: 'conversation_1',
    authorId: 'user_1',
    parentId: null,
    content: 'hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    unsentAt: null,
    author: { id: 'user_1', email: 'user@example.com', displayName: 'User One' },
    attachments: [],
    reactions: [],
    replies: [],
    ...overrides,
  };
}
