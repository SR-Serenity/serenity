import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getChannels(organizationId: string) {
    return this.prisma.channel.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });
  }

  async getChannelMessages(channelId: string, limit = 50, cursor?: string) {
    return this.prisma.message.findMany({
      where: {
        channelId,
        parentMessageId: null, // Only top-level messages
      },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          include: { user: true }
        },
        reactions: {
          include: {
            member: { include: { user: true } }
          }
        },
        _count: {
          select: { replies: true }
        }
      }
    });
  }

  async getThreadMessages(parentMessageId: string) {
    return this.prisma.message.findMany({
      where: { parentMessageId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          include: { user: true }
        },
        reactions: {
          include: {
            member: { include: { user: true } }
          }
        }
      }
    });
  }

  async getConversations(memberId: string) {
    return this.prisma.conversation.findMany({
      where: {
        members: {
          some: { memberId }
        }
      },
      include: {
        members: {
          include: {
            member: { include: { user: true } }
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });
  }

  async getConversationMessages(conversationId: string, limit = 50, cursor?: string) {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        parentMessageId: null,
      },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          include: { user: true }
        },
        reactions: {
          include: {
            member: { include: { user: true } }
          }
        },
        _count: {
          select: { replies: true }
        }
      }
    });
  }
}
