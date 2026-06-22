-- AlterTable: add proposedActions to ChatMessage
-- automation_executions is managed by the AI service, not Prisma — do not drop it
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "proposedActions" JSONB;
