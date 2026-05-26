-- CreateEnum
CREATE TYPE "OfficeRoomType" AS ENUM ('OPEN', 'PRIVATE', 'FOCUS', 'SOCIAL');

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
