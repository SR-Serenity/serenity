-- CreateEnum
CREATE TYPE "WikiSharePermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

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

-- CreateIndex
CREATE INDEX "WikiPageShare_pageId_idx" ON "WikiPageShare"("pageId");

-- CreateIndex
CREATE INDEX "WikiPageShare_userId_idx" ON "WikiPageShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageShare_pageId_userId_key" ON "WikiPageShare"("pageId", "userId");

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageShare" ADD CONSTRAINT "WikiPageShare_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
