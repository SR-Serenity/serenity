-- CreateEnum
CREATE TYPE "CalendarItemType" AS ENUM ('EVENT', 'MEETING', 'TASK');

-- CreateEnum
CREATE TYPE "CalendarVisibility" AS ENUM ('COMPANY', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CalendarTaskStatus" AS ENUM ('TODO', 'DONE');

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
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "taskStatus" "CalendarTaskStatus",
    "dueDate" TIMESTAMP(3),
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
CREATE UNIQUE INDEX "CalendarAttendee_itemId_userId_key" ON "CalendarAttendee"("itemId", "userId");

-- CreateIndex
CREATE INDEX "CalendarAttendee_userId_idx" ON "CalendarAttendee"("userId");

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAttendee" ADD CONSTRAINT "CalendarAttendee_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CalendarItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAttendee" ADD CONSTRAINT "CalendarAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
