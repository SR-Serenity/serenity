import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AppendAiMessagesDto,
  CreateAiSessionDto,
  UpdateAiSessionDto,
} from './dto/ai.dto';

type AiMessage = {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  proposedActions: unknown;
  createdAt: Date;
};

type AiSessionWithMessages = {
  id: string;
  title: string;
  orgId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: AiMessage[];
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(orgId: string, userId: string) {
    const sessions = await this.prisma.aiSession.findMany({
      where: { orgId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    return { sessions: sessions.map(s => this.toSessionSummary(s)) };
  }

  async createSession(orgId: string, userId: string, input: CreateAiSessionDto) {
    const session = await this.prisma.aiSession.create({
      data: {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        orgId,
        userId,
        title: input.title || 'New chat',
      },
      include: { messages: true },
    });
    return this.toSessionDto(session);
  }

  async getSession(orgId: string, userId: string, sessionId: string) {
    const session = await this.findSession(orgId, userId, sessionId);
    return this.toSessionDto(session);
  }

  async updateSession(orgId: string, userId: string, sessionId: string, input: UpdateAiSessionDto) {
    await this.findSession(orgId, userId, sessionId);
    const session = await this.prisma.aiSession.update({
      where: { id: sessionId },
      data: { title: input.title },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toSessionDto(session);
  }

  async deleteSession(orgId: string, userId: string, sessionId: string) {
    await this.findSession(orgId, userId, sessionId);
    await this.prisma.aiMessage.deleteMany({ where: { sessionId } });
    await this.prisma.aiSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async appendMessages(
    orgId: string,
    userId: string,
    sessionId: string,
    input: AppendAiMessagesDto,
  ) {
    await this.findSession(orgId, userId, sessionId);

    const makeMessageId = () =>
      `aim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.random()
        .toString(36)
        .slice(2, 4)}`;

    const created = await this.prisma.$transaction(
      input.messages.map(msg =>
        this.prisma.aiMessage.create({
          data: {
            id: makeMessageId(),
            sessionId,
            role: msg.role,
            content: msg.content,
            sources: msg.sources
              ? (msg.sources as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            proposedActions: msg.proposedActions
              ? (msg.proposedActions as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        }),
      ),
    );

    // Update session title from first user message if still default
    const session = await this.prisma.aiSession.findUnique({ where: { id: sessionId } });
    if (session && session.title === 'New chat') {
      const firstUser = input.messages.find(m => m.role === 'user');
      if (firstUser) {
        const title = firstUser.content.trim().slice(0, 50);
        await this.prisma.aiSession.update({
          where: { id: sessionId },
          data: {
            title: title.length < firstUser.content.trim().length ? title + '…' : title,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      await this.prisma.aiSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    }

    return { messages: created.map(m => this.toMessageDto(m)) };
  }

  private async findSession(orgId: string, userId: string, sessionId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
      select: { role: true },
    });
    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    const session = await this.prisma.aiSession.findFirst({
      where: { id: sessionId, orgId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) {
      throw new NotFoundException('AI session not found');
    }
    return session;
  }

  private toSessionSummary(session: AiSessionWithMessages) {
    return {
      id: session.id,
      title: session.title,
      orgId: session.orgId,
      userId: session.userId,
      preview: session.messages[0]?.content.slice(0, 80) ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toSessionDto(session: AiSessionWithMessages) {
    return {
      id: session.id,
      title: session.title,
      orgId: session.orgId,
      userId: session.userId,
      messages: session.messages.map(m => this.toMessageDto(m)),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toMessageDto(msg: AiMessage) {
    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      sources: msg.sources ?? null,
      proposedActions: msg.proposedActions ?? null,
      createdAt: msg.createdAt,
    };
  }
}
