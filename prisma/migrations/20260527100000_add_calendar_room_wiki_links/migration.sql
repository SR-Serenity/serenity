-- AlterTable: add roomId and wikiPageId to CalendarItem
ALTER TABLE "CalendarItem" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
ALTER TABLE "CalendarItem" ADD COLUMN IF NOT EXISTS "wikiPageId" TEXT;

-- Unique constraint for one-to-one wiki page link
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarItem_wikiPageId_key') THEN
    ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_wikiPageId_key" UNIQUE ("wikiPageId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarItem_roomId_fkey') THEN
    ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarItem_wikiPageId_fkey') THEN
    ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CalendarItem_roomId_idx" ON "CalendarItem"("roomId");
