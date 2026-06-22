-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChatConversationType" AS ENUM ('PUBLIC_CHANNEL', 'PRIVATE_CHANNEL', 'DM');

-- CreateEnum
CREATE TYPE "ChatAttachmentKind" AS ENUM ('FILE', 'GIF');

-- CreateEnum
CREATE TYPE "ChatAttachmentUploadStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMPLOYEE', 'GUEST', 'AI_AGENT');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INVITED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CalendarItemType" AS ENUM ('EVENT', 'MEETING', 'TASK');

-- CreateEnum
CREATE TYPE "CalendarVisibility" AS ENUM ('COMPANY', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CalendarTaskStatus" AS ENUM ('TODO', 'DONE');

-- CreateEnum
CREATE TYPE "WikiPageVisibility" AS ENUM ('WORKSPACE', 'DEPARTMENT', 'PRIVATE');

-- CreateEnum
CREATE TYPE "WikiSharePermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "MailAccountStatus" AS ENUM ('CONNECTED', 'NEEDS_REAUTH', 'ERROR');

-- CreateEnum
CREATE TYPE "OfficeRoomType" AS ENUM ('OPEN', 'PRIVATE', 'FOCUS', 'SOCIAL');

-- CreateEnum
CREATE TYPE "MailMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskSourceType" AS ENUM ('MANUAL', 'CHAT', 'WIKI', 'EMAIL', 'CALENDAR', 'DOCUMENT', 'AI');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('SCHEDULE', 'MEMBER_JOINED', 'MESSAGE_KEYWORD', 'TASK_CREATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('AI_AGENT', 'NOTIFY', 'CREATE_TASK', 'POST_CHANNEL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "title" TEXT,
    "departmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "sourceType" "TaskSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "sourceTitle" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "CalendarItemType" NOT NULL,
    "visibility" "CalendarVisibility" NOT NULL DEFAULT 'PERSONAL',
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "location" TEXT,
    "roomId" TEXT,
    "wikiPageId" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "taskStatus" "CalendarTaskStatus",
    "dueDate" TIMESTAMP(3),
    "googleEventId" TEXT,
    "googleAccountId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarAttendee" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "coverColor" TEXT,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "contentJson" JSONB,
    "visibility" "WikiPageVisibility" NOT NULL DEFAULT 'PRIVATE',
    "departmentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageFavorite" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageRecent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageRecent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageShare" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "WikiSharePermission" NOT NULL DEFAULT 'VIEW',
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiPageShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "departmentId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "ChatConversationType" NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "dmKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "replyToId" TEXT,
    "content" TEXT NOT NULL,
    "isCopilot" BOOLEAN NOT NULL DEFAULT false,
    "proposedActions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "unsentAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageVisibility" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "orgId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" "ChatAttachmentKind" NOT NULL,
    "uploadStatus" "ChatAttachmentUploadStatus" NOT NULL DEFAULT 'PENDING',
    "publicId" TEXT NOT NULL,
    "url" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "provider" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "historyId" TEXT,
    "watchExpirationAt" TIMESTAMP(3),
    "status" "MailAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailThread" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerThreadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "toEmails" TEXT[],
    "labelIds" TEXT[],
    "unread" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "direction" "MailMessageDirection" NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "labelIds" TEXT[],
    "sentAt" TIMESTAMP(3),
    "internalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailAttachment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerAttachmentId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeRoom" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OfficeRoomType" NOT NULL DEFAULT 'OPEN',
    "icon" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "position" JSONB,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeRoomParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingNote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "sessionStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "proposedActions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "title" TEXT,
    "mimeType" TEXT,
    "gcsUri" TEXT,
    "chunksCount" INTEGER NOT NULL DEFAULT 0,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "docFileId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerConfig" JSONB NOT NULL DEFAULT '{}',
    "actionType" "AutomationActionType" NOT NULL,
    "actionConfig" JSONB NOT NULL DEFAULT '{}',
    "stepsGraph" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Department_orgId_idx" ON "Department"("orgId");

-- CreateIndex
CREATE INDEX "Contact_orgId_idx" ON "Contact"("orgId");

-- CreateIndex
CREATE INDEX "Contact_orgId_type_idx" ON "Contact"("orgId", "type");

-- CreateIndex
CREATE INDEX "Contact_departmentId_idx" ON "Contact"("departmentId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Task_orgId_idx" ON "Task"("orgId");

-- CreateIndex
CREATE INDEX "Task_orgId_status_idx" ON "Task"("orgId", "status");

-- CreateIndex
CREATE INDEX "Task_orgId_assigneeId_idx" ON "Task"("orgId", "assigneeId");

-- CreateIndex
CREATE INDEX "Task_orgId_dueDate_idx" ON "Task"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_orgId_createdByAi_idx" ON "Task"("orgId", "createdByAi");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarItem_wikiPageId_key" ON "CalendarItem"("wikiPageId");

-- CreateIndex
CREATE INDEX "CalendarItem_orgId_startAt_idx" ON "CalendarItem"("orgId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarItem_orgId_dueDate_idx" ON "CalendarItem"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "CalendarItem_orgId_visibility_idx" ON "CalendarItem"("orgId", "visibility");

-- CreateIndex
CREATE INDEX "CalendarItem_createdById_idx" ON "CalendarItem"("createdById");

-- CreateIndex
CREATE INDEX "CalendarItem_deletedAt_idx" ON "CalendarItem"("deletedAt");

-- CreateIndex
CREATE INDEX "CalendarItem_roomId_idx" ON "CalendarItem"("roomId");

-- CreateIndex
CREATE INDEX "CalendarItem_createdById_googleEventId_idx" ON "CalendarItem"("createdById", "googleEventId");

-- CreateIndex
CREATE INDEX "CalendarAttendee_userId_idx" ON "CalendarAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAttendee_itemId_userId_key" ON "CalendarAttendee"("itemId", "userId");

-- CreateIndex
CREATE INDEX "WikiPage_orgId_parentId_idx" ON "WikiPage"("orgId", "parentId");

-- CreateIndex
CREATE INDEX "WikiPage_orgId_visibility_idx" ON "WikiPage"("orgId", "visibility");

-- CreateIndex
CREATE INDEX "WikiPage_orgId_updatedAt_idx" ON "WikiPage"("orgId", "updatedAt");

-- CreateIndex
CREATE INDEX "WikiPage_createdById_idx" ON "WikiPage"("createdById");

-- CreateIndex
CREATE INDEX "WikiPage_departmentId_idx" ON "WikiPage"("departmentId");

-- CreateIndex
CREATE INDEX "WikiPage_deletedAt_idx" ON "WikiPage"("deletedAt");

-- CreateIndex
CREATE INDEX "WikiPageFavorite_userId_createdAt_idx" ON "WikiPageFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageFavorite_pageId_userId_key" ON "WikiPageFavorite"("pageId", "userId");

-- CreateIndex
CREATE INDEX "WikiPageRecent_userId_viewedAt_idx" ON "WikiPageRecent"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageRecent_pageId_userId_key" ON "WikiPageRecent"("pageId", "userId");

-- CreateIndex
CREATE INDEX "WikiPageShare_pageId_idx" ON "WikiPageShare"("pageId");

-- CreateIndex
CREATE INDEX "WikiPageShare_userId_idx" ON "WikiPageShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageShare_pageId_userId_key" ON "WikiPageShare"("pageId", "userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_orgId_idx" ON "WorkspaceMember"("orgId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_departmentId_idx" ON "WorkspaceMember"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_orgId_key" ON "WorkspaceMember"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_orgId_idx" ON "Invitation"("orgId");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_orgId_idx" ON "Invitation"("email", "orgId");

-- CreateIndex
CREATE INDEX "ChatConversation_orgId_type_idx" ON "ChatConversation"("orgId", "type");

-- CreateIndex
CREATE INDEX "ChatConversation_orgId_updatedAt_id_idx" ON "ChatConversation"("orgId", "updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_orgId_slug_key" ON "ChatConversation"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_orgId_dmKey_key" ON "ChatConversation"("orgId", "dmKey");

-- CreateIndex
CREATE INDEX "ChatConversationMember_userId_idx" ON "ChatConversationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversationMember_conversationId_userId_key" ON "ChatConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_parentId_createdAt_idx" ON "ChatMessage"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_parentId_createdAt_id_idx" ON "ChatMessage"("conversationId", "parentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ChatMessageVisibility_userId_deletedAt_idx" ON "ChatMessageVisibility"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageVisibility_messageId_userId_key" ON "ChatMessageVisibility"("messageId", "userId");

-- CreateIndex
CREATE INDEX "ChatReaction_userId_idx" ON "ChatReaction"("userId");

-- CreateIndex
CREATE INDEX "ChatReaction_messageId_createdAt_idx" ON "ChatReaction"("messageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");

-- CreateIndex
CREATE INDEX "ChatAttachment_conversationId_uploadedById_uploadStatus_idx" ON "ChatAttachment"("conversationId", "uploadedById", "uploadStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ChatAttachment_publicId_key" ON "ChatAttachment"("publicId");

-- CreateIndex
CREATE INDEX "MailAccount_orgId_userId_idx" ON "MailAccount"("orgId", "userId");

-- CreateIndex
CREATE INDEX "MailAccount_email_idx" ON "MailAccount"("email");

-- CreateIndex
CREATE INDEX "MailAccount_status_updatedAt_idx" ON "MailAccount"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailAccount_provider_providerAccountId_key" ON "MailAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "MailThread_orgId_lastMessageAt_idx" ON "MailThread"("orgId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "MailThread_accountId_unread_idx" ON "MailThread"("accountId", "unread");

-- CreateIndex
CREATE INDEX "MailThread_accountId_trashed_idx" ON "MailThread"("accountId", "trashed");

-- CreateIndex
CREATE UNIQUE INDEX "MailThread_accountId_providerThreadId_key" ON "MailThread"("accountId", "providerThreadId");

-- CreateIndex
CREATE INDEX "MailMessage_threadId_sentAt_idx" ON "MailMessage"("threadId", "sentAt");

-- CreateIndex
CREATE INDEX "MailMessage_orgId_sentAt_idx" ON "MailMessage"("orgId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailMessage_accountId_providerMessageId_key" ON "MailMessage"("accountId", "providerMessageId");

-- CreateIndex
CREATE INDEX "MailAttachment_messageId_idx" ON "MailAttachment"("messageId");

-- CreateIndex
CREATE INDEX "MailAttachment_threadId_idx" ON "MailAttachment"("threadId");

-- CreateIndex
CREATE INDEX "MailAttachment_accountId_idx" ON "MailAttachment"("accountId");

-- CreateIndex
CREATE INDEX "OfficeRoom_orgId_idx" ON "OfficeRoom"("orgId");

-- CreateIndex
CREATE INDEX "OfficeRoom_orgId_deletedAt_idx" ON "OfficeRoom"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "OfficeRoomParticipant_userId_idx" ON "OfficeRoomParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeRoomParticipant_roomId_userId_key" ON "OfficeRoomParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "MeetingNote_roomId_sessionStartAt_idx" ON "MeetingNote"("roomId", "sessionStartAt");

-- CreateIndex
CREATE INDEX "MeetingNote_orgId_idx" ON "MeetingNote"("orgId");

-- CreateIndex
CREATE INDEX "AiSession_orgId_userId_updatedAt_idx" ON "AiSession"("orgId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiMessage_sessionId_createdAt_idx" ON "AiMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentFile_orgId_idx" ON "DocumentFile"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFile_orgId_fileId_key" ON "DocumentFile"("orgId", "fileId");

-- CreateIndex
CREATE INDEX "DocumentChunk_orgId_idx" ON "DocumentChunk"("orgId");

-- CreateIndex
CREATE INDEX "AutomationRule_orgId_idx" ON "AutomationRule"("orgId");

-- CreateIndex
CREATE INDEX "AutomationRule_orgId_triggerType_enabled_idx" ON "AutomationRule"("orgId", "triggerType", "enabled");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAttendee" ADD CONSTRAINT "CalendarAttendee_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CalendarItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAttendee" ADD CONSTRAINT "CalendarAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageFavorite" ADD CONSTRAINT "WikiPageFavorite_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageFavorite" ADD CONSTRAINT "WikiPageFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageRecent" ADD CONSTRAINT "WikiPageRecent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageRecent" ADD CONSTRAINT "WikiPageRecent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversationMember" ADD CONSTRAINT "ChatConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversationMember" ADD CONSTRAINT "ChatConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageVisibility" ADD CONSTRAINT "ChatMessageVisibility_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageVisibility" ADD CONSTRAINT "ChatMessageVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeRoom" ADD CONSTRAINT "OfficeRoom_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeRoom" ADD CONSTRAINT "OfficeRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeRoomParticipant" ADD CONSTRAINT "OfficeRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeRoomParticipant" ADD CONSTRAINT "OfficeRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_docFileId_fkey" FOREIGN KEY ("docFileId") REFERENCES "DocumentFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- automation_executions is managed by the AI service directly (not a Prisma model)
CREATE TABLE IF NOT EXISTS automation_executions (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    instruction TEXT NOT NULL,
    context     JSONB NOT NULL DEFAULT '{}',
    content     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
