-- Phase A chat scaling indexes
CREATE INDEX "ChatConversation_orgId_updatedAt_id_idx"
ON "ChatConversation"("orgId", "updatedAt", "id");

CREATE INDEX "ChatMessage_conversationId_parentId_createdAt_id_idx"
ON "ChatMessage"("conversationId", "parentId", "createdAt", "id");

CREATE INDEX "ChatReaction_messageId_createdAt_idx"
ON "ChatReaction"("messageId", "createdAt");
