-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "MailAccountStatus" AS ENUM ('CONNECTED', 'NEEDS_REAUTH', 'ERROR');

-- CreateEnum
CREATE TYPE "MailMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

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

-- CreateIndex
CREATE UNIQUE INDEX "MailAccount_provider_providerAccountId_key" ON "MailAccount"("provider", "providerAccountId");
CREATE INDEX "MailAccount_orgId_userId_idx" ON "MailAccount"("orgId", "userId");
CREATE INDEX "MailAccount_email_idx" ON "MailAccount"("email");
CREATE INDEX "MailAccount_status_updatedAt_idx" ON "MailAccount"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailThread_accountId_providerThreadId_key" ON "MailThread"("accountId", "providerThreadId");
CREATE INDEX "MailThread_orgId_lastMessageAt_idx" ON "MailThread"("orgId", "lastMessageAt");
CREATE INDEX "MailThread_accountId_unread_idx" ON "MailThread"("accountId", "unread");
CREATE INDEX "MailThread_accountId_trashed_idx" ON "MailThread"("accountId", "trashed");

-- CreateIndex
CREATE UNIQUE INDEX "MailMessage_accountId_providerMessageId_key" ON "MailMessage"("accountId", "providerMessageId");
CREATE INDEX "MailMessage_threadId_sentAt_idx" ON "MailMessage"("threadId", "sentAt");
CREATE INDEX "MailMessage_orgId_sentAt_idx" ON "MailMessage"("orgId", "sentAt");

-- CreateIndex
CREATE INDEX "MailAttachment_messageId_idx" ON "MailAttachment"("messageId");
CREATE INDEX "MailAttachment_threadId_idx" ON "MailAttachment"("threadId");
CREATE INDEX "MailAttachment_accountId_idx" ON "MailAttachment"("accountId");

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
