ALTER TABLE "ChatConversation"
ADD COLUMN "dmKey" TEXT;

ALTER TABLE "ChatMessage"
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "unsentAt" TIMESTAMP(3);

CREATE TYPE "ChatAttachmentUploadStatus" AS ENUM ('PENDING', 'COMPLETED');

ALTER TABLE "ChatAttachment"
ADD COLUMN "orgId" TEXT,
ADD COLUMN "conversationId" TEXT,
ADD COLUMN "uploadedById" TEXT,
ADD COLUMN "publicId" TEXT,
ADD COLUMN "uploadStatus" "ChatAttachmentUploadStatus" NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "messageId" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

UPDATE "ChatAttachment" AS attachment
SET
  "conversationId" = message."conversationId",
  "uploadedById" = message."authorId",
  "orgId" = conversation."orgId",
  "publicId" = COALESCE(attachment."metadata"->>'publicId', attachment."id")
FROM "ChatMessage" AS message
JOIN "ChatConversation" AS conversation
  ON conversation."id" = message."conversationId"
WHERE attachment."messageId" = message."id";

ALTER TABLE "ChatAttachment"
ALTER COLUMN "orgId" SET NOT NULL,
ALTER COLUMN "conversationId" SET NOT NULL,
ALTER COLUMN "uploadedById" SET NOT NULL,
ALTER COLUMN "publicId" SET NOT NULL;

CREATE TABLE "ChatMessageVisibility" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessageVisibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatConversation_orgId_dmKey_key"
ON "ChatConversation"("orgId", "dmKey");

CREATE UNIQUE INDEX "ChatAttachment_publicId_key"
ON "ChatAttachment"("publicId");

CREATE INDEX "ChatAttachment_conversationId_uploadedById_uploadStatus_idx"
ON "ChatAttachment"("conversationId", "uploadedById", "uploadStatus");

CREATE UNIQUE INDEX "ChatMessageVisibility_messageId_userId_key"
ON "ChatMessageVisibility"("messageId", "userId");

CREATE INDEX "ChatMessageVisibility_userId_deletedAt_idx"
ON "ChatMessageVisibility"("userId", "deletedAt");

ALTER TABLE "ChatMessageVisibility"
ADD CONSTRAINT "ChatMessageVisibility_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessageVisibility"
ADD CONSTRAINT "ChatMessageVisibility_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatAttachment"
ADD CONSTRAINT "ChatAttachment_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatAttachment"
ADD CONSTRAINT "ChatAttachment_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatAttachment"
ADD CONSTRAINT "ChatAttachment_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
