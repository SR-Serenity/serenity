import { BadRequestException, Injectable } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';

export type GmailMessageInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
};

@Injectable()
export class GmailClient {
  authUrl(state: string) {
    const oauth = this.oauthClient();
    return oauth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    });
  }

  async exchangeCode(code: string) {
    const oauth = this.oauthClient();
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException('Google did not return a refresh token');
    }
    oauth.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return {
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: profile.data.emailAddress ?? '',
      providerAccountId: profile.data.emailAddress ?? '',
      historyId: profile.data.historyId ?? null,
    };
  }

  async watch(refreshToken: string) {
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC;
    if (!topicName) {
      return null;
    }
    const gmail = this.gmail(refreshToken);
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
      },
    });
    return {
      historyId: response.data.historyId ?? null,
      expiration: response.data.expiration
        ? new Date(Number(response.data.expiration))
        : null,
    };
  }

  async profile(refreshToken: string) {
    const response = await this.gmail(refreshToken).users.getProfile({ userId: 'me' });
    return response.data;
  }

  async listAllMessageIds(refreshToken: string) {
    const gmail = this.gmail(refreshToken);
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 500,
        pageToken,
      });
      ids.push(...((response.data.messages?.map((message) => message.id).filter(Boolean) as string[]) ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
  }

  async listHistoryMessageIds(refreshToken: string, startHistoryId: string) {
    const gmail = this.gmail(refreshToken);
    const ids = new Set<string>();
    let pageToken: string | undefined;
    let latestHistoryId: string | null = null;

    do {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded', 'labelAdded', 'labelRemoved'],
        pageToken,
      });
      latestHistoryId = response.data.historyId ?? latestHistoryId;
      for (const history of response.data.history ?? []) {
        for (const item of [
          ...(history.messagesAdded ?? []).map((entry) => entry.message),
          ...(history.labelsAdded ?? []).map((entry) => entry.message),
          ...(history.labelsRemoved ?? []).map((entry) => entry.message),
        ]) {
          if (item?.id) {
            ids.add(item.id);
          }
        }
      }
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return { ids: [...ids], latestHistoryId };
  }

  async getMessage(refreshToken: string, messageId: string) {
    const response = await this.gmail(refreshToken).users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  }

  async modifyThread(refreshToken: string, threadId: string, addLabelIds: string[], removeLabelIds: string[]) {
    await this.gmail(refreshToken).users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: { addLabelIds, removeLabelIds },
    });
  }

  async trashThread(refreshToken: string, threadId: string) {
    await this.gmail(refreshToken).users.threads.trash({ userId: 'me', id: threadId });
  }

  async untrashThread(refreshToken: string, threadId: string) {
    await this.gmail(refreshToken).users.threads.untrash({ userId: 'me', id: threadId });
  }

  async send(refreshToken: string, input: GmailMessageInput) {
    const response = await this.gmail(refreshToken).users.messages.send({
      userId: 'me',
      requestBody: {
        raw: this.createRawMessage(input),
        threadId: input.threadId,
      },
    });
    return response.data;
  }

  async attachment(refreshToken: string, messageId: string, attachmentId: string) {
    const response = await this.gmail(refreshToken).users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    return response.data;
  }

  private gmail(refreshToken: string) {
    const oauth = this.oauthClient();
    oauth.setCredentials({ refresh_token: refreshToken });
    return google.gmail({ version: 'v1', auth: oauth });
  }

  private oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private createRawMessage(input: GmailMessageInput) {
    const headers = [
      `To: ${input.to.join(', ')}`,
      input.cc?.length ? `Cc: ${input.cc.join(', ')}` : null,
      input.bcc?.length ? `Bcc: ${input.bcc.join(', ')}` : null,
      `Subject: ${this.encodeHeader(input.subject)}`,
      input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
      input.references ? `References: ${input.references}` : null,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
    ].filter(Boolean);

    return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${input.body}`, 'utf8')
      .toString('base64url');
  }

  private encodeHeader(value: string) {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }
}

export type GmailMessage = gmail_v1.Schema$Message;
export type GmailMessagePart = gmail_v1.Schema$MessagePart;
