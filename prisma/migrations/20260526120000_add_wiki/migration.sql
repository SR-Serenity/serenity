-- CreateEnum
CREATE TYPE "WikiPageVisibility" AS ENUM ('WORKSPACE', 'DEPARTMENT', 'PRIVATE');

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
CREATE UNIQUE INDEX "WikiPageFavorite_pageId_userId_key" ON "WikiPageFavorite"("pageId", "userId");

-- CreateIndex
CREATE INDEX "WikiPageFavorite_userId_createdAt_idx" ON "WikiPageFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageRecent_pageId_userId_key" ON "WikiPageRecent"("pageId", "userId");

-- CreateIndex
CREATE INDEX "WikiPageRecent_userId_viewedAt_idx" ON "WikiPageRecent"("userId", "viewedAt");

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
