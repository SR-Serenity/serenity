-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create DocumentFile table
CREATE TABLE "DocumentFile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "title" TEXT,
  "mimeType" TEXT,
  "gcsUri" TEXT,
  "chunksCount" INTEGER NOT NULL DEFAULT 0,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- Create DocumentChunk table
CREATE TABLE "DocumentChunk" (
  "id" TEXT NOT NULL,
  "docFileId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "page" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "embedding" vector(1536),

  CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "DocumentFile_orgId_fileId_key" ON "DocumentFile"("orgId", "fileId");
CREATE INDEX "DocumentFile_orgId_idx" ON "DocumentFile"("orgId");
CREATE INDEX "DocumentChunk_orgId_idx" ON "DocumentChunk"("orgId");

-- Vector similarity index (HNSW for fast approximate nearest neighbor)
CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops);

-- Full-text search index for hybrid search (BM25)
CREATE INDEX "DocumentChunk_text_idx" ON "DocumentChunk" USING gin(to_tsvector('english', "text"));

-- Add foreign key constraints
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_docFileId_fkey"
  FOREIGN KEY ("docFileId") REFERENCES "DocumentFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
