import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailAccountStatus, MailProvider } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ForwardMailDto,
  ListMailThreadsQueryDto,
  ReplyMailDto,
  SendMailDto,
} from './dto/mail.dto';
import { GmailClient } from './gmail/gmail.client';
import { MailSyncService } from './mail-sync.service';
import { MailTokenService } from './mail-token.service';
import { MailQueueService } from './queue/mail-queue.service';

type OAuthState = {
  orgId: string;
  userId: string;
  returnTo: string;
};

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gmail: GmailClient,
    private readonly tokenService: MailTokenService,
    private readonly sync: MailSyncService,
    private readonly queue: MailQueueService,
  ) {}

  async listAccounts(orgId: string, userId: string) {
    await this.sync.ensureOrgAccess(orgId, userId);
    const accounts = await this.prisma.mailAccount.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: 'asc' },
    });
    return { accounts: accounts.map((account) => this.toAccountDto(account)) };
  }

  async connectGoogle(orgId: string, userId: string, returnTo?: string) {
    await this.sync.ensureOrgAccess(orgId, userId);
    const webUrl = process.env.WEB_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:2997';
    const state = Buffer.from(JSON.stringify({
      orgId,
      userId,
      returnTo: returnTo || `${webUrl}/mail-connected`,
    } satisfies OAuthState)).toString('base64url');
    return { url: this.gmail.authUrl(state) };
  }

  async handleGoogleCallback(code: string, state: string) {
    const parsed = this.parseState(state);
    try {
      await this.sync.ensureOrgAccess(parsed.orgId, parsed.userId);
      const exchanged = await this.gmail.exchangeCode(code);
      if (!exchanged.email) {
        throw new BadRequestException('Google profile did not return an email address');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: parsed.userId },
        select: { email: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (exchanged.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new BadRequestException(
          `You can only connect a Google account matching your Serenity email (${user.email})`
        );
      }

      const encryptedRefreshToken = this.tokenService.encrypt(exchanged.refreshToken);
      const account = await this.prisma.mailAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: MailProvider.GOOGLE,
            providerAccountId: exchanged.providerAccountId,
          },
        },
        create: {
          orgId: parsed.orgId,
          userId: parsed.userId,
          provider: MailProvider.GOOGLE,
          providerAccountId: exchanged.providerAccountId,
          email: exchanged.email,
          displayName: exchanged.email,
          encryptedRefreshToken,
          accessTokenExpiresAt: exchanged.expiryDate,
          historyId: exchanged.historyId,
          status: MailAccountStatus.CONNECTED,
        },
        update: {
          orgId: parsed.orgId,
          userId: parsed.userId,
          email: exchanged.email,
          displayName: exchanged.email,
          encryptedRefreshToken,
          accessTokenExpiresAt: exchanged.expiryDate,
          historyId: exchanged.historyId,
          status: MailAccountStatus.CONNECTED,
          lastError: null,
        },
      });
      await this.queue.enqueueSync(account.id, 'initial');
      await this.queue.enqueueWatchRenewal(account.id);
      return parsed.returnTo;
    } catch (e) {
      if (parsed?.returnTo) {
        const errorParam = e instanceof BadRequestException ? 'email_mismatch' : 'connection_failed';
        const separator = parsed.returnTo.includes('?') ? '&' : '?';
        return `${parsed.returnTo}${separator}error=${errorParam}`;
      }
      throw e;
    }
  }

  async disconnectAccount(orgId: string, userId: string, accountId: string) {
    await this.sync.ensureAccountAccess(orgId, userId, accountId);
    await this.prisma.mailAccount.delete({ where: { id: accountId } });
    return { success: true };
  }

  async listThreads(orgId: string, userId: string, query: ListMailThreadsQueryDto) {
    await this.sync.ensureOrgAccess(orgId, userId);
    const accountId = query.accountId
      ? (await this.sync.ensureAccountAccess(orgId, userId, query.accountId)).id
      : undefined;
    const where = {
      orgId,
      ...(accountId ? { accountId } : { account: { userId } }),
      ...this.labelWhere(query.label),
      ...(query.q ? {
        OR: [
          { subject: { contains: query.q, mode: 'insensitive' as const } },
          { snippet: { contains: query.q, mode: 'insensitive' as const } },
          { fromEmail: { contains: query.q, mode: 'insensitive' as const } },
          { fromName: { contains: query.q, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(query.cursor ? { lastMessageAt: { lt: new Date(query.cursor) } } : {}),
      ...(query.read === 'read' ? { unread: false } : {}),
      ...(query.read === 'unread' ? { unread: true } : {}),
    };

    const threads = await this.prisma.mailThread.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: 31,
    });
    const hasMore = threads.length > 30;
    const page = hasMore ? threads.slice(0, 30) : threads;
    return {
      threads: page.map((thread) => this.toThreadDto(thread)),
      nextCursor: hasMore ? page[page.length - 1]?.lastMessageAt?.toISOString() ?? null : null,
    };
  }

  async getThread(orgId: string, userId: string, threadId: string) {
    await this.sync.ensureThreadAccess(orgId, userId, threadId);
    const thread = await this.prisma.mailThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          include: { attachments: true },
          orderBy: [{ sentAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Mail thread not found');
    }
    return {
      ...this.toThreadDto(thread),
      messages: thread.messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        subject: message.subject,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        toEmails: message.toEmails,
        ccEmails: message.ccEmails,
        attachments: message.attachments.map((attachment) => ({
          id: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
        })),
        sentAt: message.sentAt,
      })),
    };
  }

  async downloadAttachment(orgId: string, userId: string, attachmentId: string) {
    const attachment = await this.prisma.mailAttachment.findFirst({
      where: { id: attachmentId, orgId, account: { userId } },
      include: {
        account: true,
        message: true,
      },
    });
    if (!attachment) {
      throw new NotFoundException('Mail attachment not found');
    }
    if (!attachment.providerAttachmentId) {
      throw new BadRequestException('Attachment file is not available from Gmail');
    }
    if (!attachment.account.encryptedRefreshToken) {
      throw new BadRequestException('Connect this account to Google before downloading attachments');
    }

    const refreshToken = this.tokenService.decrypt(attachment.account.encryptedRefreshToken);
    const gmailAttachment = await this.gmail.attachment(
      refreshToken,
      attachment.message.providerMessageId,
      attachment.providerAttachmentId,
    );
    if (!gmailAttachment.data) {
      throw new BadRequestException('Gmail returned an empty attachment');
    }

    return {
      buffer: Buffer.from(gmailAttachment.data, 'base64url'),
      filename: attachment.filename,
      mimeType: attachment.mimeType ?? 'application/octet-stream',
    };
  }

  async send(orgId: string, userId: string, input: SendMailDto) {
    const account = await this.sync.ensureAccountAccess(orgId, userId, input.accountId);
    if (!account.encryptedRefreshToken) {
      throw new BadRequestException('Connect this account to Google before sending mail');
    }
    const refreshToken = this.tokenService.decrypt(account.encryptedRefreshToken);
    const sent = await this.gmail.send(refreshToken, input);
    await this.saveSentMessage(account.id, refreshToken, sent.id);
    await this.queue.enqueueSync(account.id, 'incremental');
    return { success: true };
  }

  async reply(orgId: string, userId: string, threadId: string, input: ReplyMailDto) {
    const thread = await this.sync.ensureThreadAccess(orgId, userId, threadId);
    const latest = await this.prisma.mailMessage.findFirst({
      where: { threadId: thread.id },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (!thread.account.encryptedRefreshToken) {
      throw new BadRequestException('Connect this account to Google before sending mail');
    }
    const refreshToken = this.tokenService.decrypt(thread.account.encryptedRefreshToken);
    const recipients = input.replyAll
      ? Array.from(new Set([thread.fromEmail, ...thread.toEmails].filter(Boolean))) as string[]
      : thread.fromEmail ? [thread.fromEmail] : [];
    if (!recipients.length) {
      throw new BadRequestException('Thread has no reply recipient');
    }
    const sent = await this.gmail.send(refreshToken, {
      to: recipients,
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      body: input.body,
      threadId: thread.providerThreadId,
      inReplyTo: latest?.providerMessageId,
      references: latest?.providerMessageId,
    });
    await this.saveSentMessage(thread.accountId, refreshToken, sent.id);
    await this.queue.enqueueSync(thread.accountId, 'incremental');
    return { success: true };
  }

  async forward(orgId: string, userId: string, threadId: string, input: ForwardMailDto) {
    const thread = await this.sync.ensureThreadAccess(orgId, userId, threadId);
    if (!thread.account.encryptedRefreshToken) {
      throw new BadRequestException('Connect this account to Google before sending mail');
    }
    const refreshToken = this.tokenService.decrypt(thread.account.encryptedRefreshToken);
    const sent = await this.gmail.send(refreshToken, {
      ...input,
      subject: input.subject || (thread.subject.startsWith('Fwd:') ? thread.subject : `Fwd: ${thread.subject}`),
    });
    await this.saveSentMessage(thread.accountId, refreshToken, sent.id);
    await this.queue.enqueueSync(thread.accountId, 'incremental');
    return { success: true };
  }

  async modifyThread(orgId: string, userId: string, threadId: string, action: string) {
    const thread = await this.sync.ensureThreadAccess(orgId, userId, threadId);
    if (!thread.account.encryptedRefreshToken) {
      throw new BadRequestException('Connect this account to Google before changing mail');
    }
    const refreshToken = this.tokenService.decrypt(thread.account.encryptedRefreshToken);
    const actions: Record<
      string,
      { add: string[]; remove: string[]; local: Record<string, boolean> }
    > = {
      read: { add: [], remove: ['UNREAD'], local: { unread: false } },
      unread: { add: ['UNREAD'], remove: [], local: { unread: true } },
      star: { add: ['STARRED'], remove: [], local: { starred: true } },
      unstar: { add: [], remove: ['STARRED'], local: { starred: false } },
      archive: { add: [], remove: ['INBOX'], local: { archived: true } },
    };
    if (action === 'trash') {
      await this.gmail.trashThread(refreshToken, thread.providerThreadId);
      await this.prisma.mailThread.update({ where: { id: thread.id }, data: { trashed: true } });
    } else if (action === 'restore') {
      await this.gmail.untrashThread(refreshToken, thread.providerThreadId);
      await this.prisma.mailThread.update({ where: { id: thread.id }, data: { trashed: false } });
    } else {
      const config = actions[action];
      if (!config) {
        throw new BadRequestException('Unsupported mail action');
      }
      await this.gmail.modifyThread(
        refreshToken,
        thread.providerThreadId,
        config.add,
        config.remove,
      );
      await this.prisma.mailThread.update({ where: { id: thread.id }, data: config.local });
    }
    await this.queue.enqueueSync(thread.accountId, 'incremental');
    return { success: true };
  }

  async handlePubSubPush(body: unknown) {
    const message = body as { message?: { data?: string } };
    const data = message.message?.data;
    if (!data) {
      return { success: true };
    }
    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as {
      emailAddress?: string;
    };
    if (!payload.emailAddress) {
      return { success: true };
    }
    const accounts = await this.prisma.mailAccount.findMany({
      where: { provider: MailProvider.GOOGLE, email: payload.emailAddress },
      select: { id: true },
    });
    for (const account of accounts) {
      await this.queue.enqueueSync(account.id, 'incremental');
    }
    return { success: true };
  }

  private parseState(state: string): OAuthState {
    try {
      return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as OAuthState;
    } catch {
      throw new BadRequestException('Invalid Google OAuth state');
    }
  }

  private async saveSentMessage(
    accountId: string,
    refreshToken: string,
    messageId?: string | null,
  ) {
    if (!messageId) {
      return;
    }
    const message = await this.gmail.getMessage(refreshToken, messageId);
    await this.sync.upsertGmailMessage(accountId, message);
  }

  private labelWhere(label?: string) {
    if (!label || label === 'inbox') {
      return { archived: false, trashed: false };
    }
    if (label === 'starred') {
      return { starred: true, trashed: false };
    }
    if (label === 'sent') {
      return { labelIds: { has: 'SENT' }, trashed: false };
    }
    if (label === 'archive') {
      return { archived: true, trashed: false };
    }
    if (label === 'trash') {
      return { trashed: true };
    }
    return {};
  }

  private toAccountDto(account: {
    id: string;
    email: string;
    displayName: string | null;
    provider: MailProvider;
    status: MailAccountStatus;
    lastSyncedAt: Date | null;
    lastError: string | null;
  }) {
    return {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      provider: account.provider,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      lastError: account.lastError,
    };
  }

  private toThreadDto(thread: {
    id: string;
    accountId: string;
    subject: string;
    snippet: string | null;
    fromName: string | null;
    fromEmail: string | null;
    unread: boolean;
    starred: boolean;
    archived: boolean;
    trashed: boolean;
    lastMessageAt: Date | null;
  }) {
    return {
      id: thread.id,
      accountId: thread.accountId,
      subject: thread.subject,
      snippet: thread.snippet,
      fromName: thread.fromName,
      fromEmail: thread.fromEmail,
      unread: thread.unread,
      starred: thread.starred,
      archived: thread.archived,
      trashed: thread.trashed,
      lastMessageAt: thread.lastMessageAt,
    };
  }
}
