export type MailAccountStatus = 'CONNECTED' | 'NEEDS_REAUTH' | 'ERROR'
export type MailMessageDirection = 'INBOUND' | 'OUTBOUND'

export interface MailAccount {
  id: string
  email: string
  displayName: string | null
  provider: 'GOOGLE'
  status: MailAccountStatus
  lastSyncedAt: string | null
  lastError: string | null
}

export interface ListMailAccountsResponse {
  accounts: MailAccount[]
}

export interface MailConnectResponse {
  url: string
}

export interface MailThread {
  id: string
  accountId: string
  subject: string
  snippet: string | null
  fromName: string | null
  fromEmail: string | null
  unread: boolean
  starred: boolean
  archived: boolean
  trashed: boolean
  lastMessageAt: string | null
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string | null
  size: number | null
}

export interface MailMessage {
  id: string
  direction: MailMessageDirection
  subject: string
  snippet: string | null
  bodyText: string | null
  bodyHtml: string | null
  fromName: string | null
  fromEmail: string | null
  toEmails: string[]
  ccEmails: string[]
  attachments: MailAttachment[]
  sentAt: string | null
}

export interface MailThreadDetail extends MailThread {
  messages: MailMessage[]
}

export interface ListMailThreadsInput {
  accountId?: string
  label?: string
  q?: string
  cursor?: string
  read?: 'read' | 'unread'
}

export interface ListMailThreadsResponse {
  threads: MailThread[]
  nextCursor: string | null
}

export interface SendMailInput {
  accountId?: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
}

export interface ReplyMailInput {
  body: string
  replyAll?: boolean
}

export type ForwardMailInput = SendMailInput

export interface MailActionResponse {
  success: boolean
}
