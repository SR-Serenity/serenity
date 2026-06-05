-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant');

-- DropForeignKey
ALTER TABLE "CalendarItem" DROP CONSTRAINT "CalendarItem_roomId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarItem" DROP CONSTRAINT "CalendarItem_wikiPageId_fkey";

-- DropIndex
DROP INDEX "DocumentChunk_embedding_idx";

-- AlterTable
ALTER TABLE "CalendarItem" ADD COLUMN     "googleAccountId" TEXT,
ADD COLUMN     "googleEventId" TEXT;

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

-- CreateIndex
CREATE INDEX "AiSession_orgId_userId_updatedAt_idx" ON "AiSession"("orgId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiMessage_sessionId_createdAt_idx" ON "AiMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarItem_createdById_googleEventId_idx" ON "CalendarItem"("createdById", "googleEventId");

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
