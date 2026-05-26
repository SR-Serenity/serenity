import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MailAccountStatus, MailMessageDirection, MailProvider, Prisma } from '@prisma/client';
import type { gmail_v1 } from 'googleapis';
import { PrismaService } from '../database/prisma.service';
import { GmailClient, type GmailMessage, type GmailMessagePart } from './gmail/gmail.client';
import { MailTokenService } from './mail-token.service';

type ParsedMessage = {
  providerMessageId: string;
  providerThreadId: string;
  subject: string;
  snippet: string | null;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  labelIds: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: Date | null;
  internalDate: Date | null;
  attachments: Array<{
    providerAttachmentId: string | null;
    filename: string;
    mimeType: string | null;
    size: number | null;
  }>;
};

@Injectable()
export class MailSyncService {
  private readonly logger = new Logger(MailSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmail: GmailClient,
    private readonly tokenService: MailTokenService,
  ) {}

  async syncAccount(accountId: string, mode: 'initial' | 'incremental' | 'fallback' = 'incremental') {
    const account = await this.prisma.mailAccount.findUnique({ where: { id: accountId } });
    if (!account) return;

    try {
      if (!account.encryptedRefreshToken) {
        await this.prisma.mailAccount.update({
          where: { id: account.id },
          data: {
            status: MailAccountStatus.NEEDS_REAUTH,
            lastError: 'Connect this account to Google before syncing',
          },
        });
        return;
      }
      const refreshToken = this.tokenService.decrypt(account.encryptedRefreshToken);
      const ids = account.historyId && mode !== 'initial'
        ? await this.gmail.listHistoryMessageIds(refreshToken, account.historyId)
        : { ids: await this.gmail.listAllMessageIds(refreshToken), latestHistoryId: null };

      for (const id of ids.ids) {
        const message = await this.gmail.getMessage(refreshToken, id);
        await this.upsertGmailMessage(account.id, message);
      }

      const profile = await this.gmail.profile(refreshToken);
      await this.prisma.mailAccount.update({
        where: { id: account.id },
        data: {
          historyId: ids.latestHistoryId ?? profile.historyId ?? account.historyId,
          lastSyncedAt: new Date(),
          lastError: null,
          status: MailAccountStatus.CONNECTED,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mail sync failed';
      this.logger.warn(`Mail sync failed for ${account.email}: ${message}`);
      await this.prisma.mailAccount.update({
        where: { id: account.id },
        data: { lastError: message, status: MailAccountStatus.ERROR },
      });
    }
  }

  async renewWatch(accountId: string) {
    const account = await this.prisma.mailAccount.findUnique({ where: { id: accountId } });
    if (!account) return;
    if (!account.encryptedRefreshToken) return;
    const refreshToken = this.tokenService.decrypt(account.encryptedRefreshToken);
    const watch = await this.gmail.watch(refreshToken);
    if (!watch) return;
    await this.prisma.mailAccount.update({
      where: { id: account.id },
      data: {
        historyId: watch.historyId ?? account.historyId,
        watchExpirationAt: watch.expiration,
      },
    });
  }

  async upsertGmailMessage(accountId: string, message: GmailMessage) {
    const account = await this.prisma.mailAccount.findUnique({ where: { id: accountId } });
    if (!account || !message.id || !message.threadId) return;

    const parsed = this.parseMessage(message);
    const unread = parsed.labelIds.includes('UNREAD');
    const starred = parsed.labelIds.includes('STARRED');
    const archived = !parsed.labelIds.includes('INBOX') && !parsed.labelIds.includes('SENT') && !parsed.labelIds.includes('TRASH');
    const trashed = parsed.labelIds.includes('TRASH');
    const direction = parsed.labelIds.includes('SENT') ? MailMessageDirection.OUTBOUND : MailMessageDirection.INBOUND;

    const thread = await this.prisma.mailThread.upsert({
      where: {
        accountId_providerThreadId: {
          accountId: account.id,
          providerThreadId: parsed.providerThreadId,
        },
      },
      create: {
        orgId: account.orgId,
        accountId: account.id,
        providerThreadId: parsed.providerThreadId,
        subject: parsed.subject,
        snippet: parsed.snippet,
        fromName: parsed.fromName,
        fromEmail: parsed.fromEmail,
        toEmails: parsed.toEmails,
        labelIds: parsed.labelIds,
        unread,
        starred,
        archived,
        trashed,
        sentAt: parsed.sentAt,
        lastMessageAt: parsed.sentAt ?? parsed.internalDate,
      },
      update: {
        subject: parsed.subject,
        snippet: parsed.snippet,
        fromName: parsed.fromName,
        fromEmail: parsed.fromEmail,
        toEmails: parsed.toEmails,
        labelIds: parsed.labelIds,
        unread,
        starred,
        archived,
        trashed,
        sentAt: parsed.sentAt,
        lastMessageAt: parsed.sentAt ?? parsed.internalDate,
      },
    });

    const mailMessage = await this.prisma.mailMessage.upsert({
      where: {
        accountId_providerMessageId: {
          accountId: account.id,
          providerMessageId: parsed.providerMessageId,
        },
      },
      create: {
        orgId: account.orgId,
        accountId: account.id,
        threadId: thread.id,
        providerMessageId: parsed.providerMessageId,
        direction,
        subject: parsed.subject,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        fromName: parsed.fromName,
        fromEmail: parsed.fromEmail,
        toEmails: parsed.toEmails,
        ccEmails: parsed.ccEmails,
        bccEmails: parsed.bccEmails,
        labelIds: parsed.labelIds,
        sentAt: parsed.sentAt,
        internalDate: parsed.internalDate,
      },
      update: {
        direction,
        subject: parsed.subject,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        fromName: parsed.fromName,
        fromEmail: parsed.fromEmail,
        toEmails: parsed.toEmails,
        ccEmails: parsed.ccEmails,
        bccEmails: parsed.bccEmails,
        labelIds: parsed.labelIds,
        sentAt: parsed.sentAt,
        internalDate: parsed.internalDate,
      },
    });

    await this.prisma.mailAttachment.deleteMany({ where: { messageId: mailMessage.id } });
    if (parsed.attachments.length) {
      await this.prisma.mailAttachment.createMany({
        data: parsed.attachments.map((attachment) => ({
          orgId: account.orgId,
          accountId: account.id,
          threadId: thread.id,
          messageId: mailMessage.id,
          ...attachment,
        })),
      });
    }
  }

  async ensureAccountAccess(orgId: string, userId: string, accountId?: string) {
    const where: Prisma.MailAccountWhereInput = accountId
      ? { id: accountId, orgId, userId }
      : { orgId, userId, status: { not: MailAccountStatus.NEEDS_REAUTH } };
    const account = await this.prisma.mailAccount.findFirst({ where, orderBy: { createdAt: 'asc' } });
    if (!account) {
      throw new NotFoundException('Mail account not found');
    }
    return account;
  }

  async ensureThreadAccess(orgId: string, userId: string, threadId: string) {
    const thread = await this.prisma.mailThread.findFirst({
      where: { id: threadId, orgId, account: { userId } },
      include: { account: true },
    });
    if (!thread) {
      throw new NotFoundException('Mail thread not found');
    }
    return thread;
  }

  async ensureOrgAccess(orgId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
      select: { id: true },
    });
    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }
  }

  private parseMessage(message: GmailMessage): ParsedMessage {
    const headers = new Map(
      (message.payload?.headers ?? []).map((header) => [
        header.name?.toLowerCase() ?? '',
        header.value ?? '',
      ]),
    );
    const from = this.parseAddress(headers.get('from') ?? '');
    const body = this.extractBody(message.payload);
    return {
      providerMessageId: message.id ?? '',
      providerThreadId: message.threadId ?? '',
      subject: headers.get('subject') || '(No subject)',
      snippet: message.snippet ?? null,
      fromName: from.name,
      fromEmail: from.email,
      toEmails: this.parseAddressList(headers.get('to')),
      ccEmails: this.parseAddressList(headers.get('cc')),
      bccEmails: this.parseAddressList(headers.get('bcc')),
      labelIds: message.labelIds ?? [],
      bodyText: body.text,
      bodyHtml: body.html,
      sentAt: this.dateFromHeader(headers.get('date')),
      internalDate: message.internalDate ? new Date(Number(message.internalDate)) : null,
      attachments: this.extractAttachments(message.payload),
    };
  }

  private extractBody(part?: GmailMessagePart): { text: string | null; html: string | null } {
    if (!part) return { text: null, html: null };
    let text: string | null = null;
    let html: string | null = null;
    const visit = (node: GmailMessagePart) => {
      const data = node.body?.data;
      if (data && node.mimeType === 'text/plain' && !text) text = this.decodeBase64Url(data);
      if (data && node.mimeType === 'text/html' && !html) html = this.decodeBase64Url(data);
      for (const child of node.parts ?? []) visit(child);
    };
    visit(part);
    return { text, html };
  }

  private extractAttachments(part?: GmailMessagePart) {
    const attachments: ParsedMessage['attachments'] = [];
    if (!part) return attachments;
    const visit = (node: GmailMessagePart) => {
      if (node.filename && node.body?.attachmentId) {
        attachments.push({
          providerAttachmentId: node.body.attachmentId,
          filename: node.filename,
          mimeType: node.mimeType ?? null,
          size: node.body.size ?? null,
        });
      }
      for (const child of node.parts ?? []) visit(child);
    };
    visit(part);
    return attachments;
  }

  private decodeBase64Url(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private dateFromHeader(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseAddress(value: string) {
    const match = value.match(/^(?:"?([^"<]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
    if (!match) return { name: null, email: value || null };
    return {
      name: match[1]?.trim() || null,
      email: match[2]?.trim() || null,
    };
  }

  private parseAddressList(value?: string) {
    if (!value) return [];
    return value
      .split(',')
      .map((item) => this.parseAddress(item.trim()).email)
      .filter(Boolean) as string[];
  }
}
