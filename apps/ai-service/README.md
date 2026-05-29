# Serenity AI Service

FastAPI service for Serenity workspace AI. Runtime configuration is loaded only from
`apps/ai-service/.env`; the repository root `.env` is intentionally ignored.

## Nx targets

- `pnpm nx serve ai-service`
- `pnpm nx test ai-service`
- `pnpm nx lint ai-service`
- `pnpm nx format ai-service`
- `pnpm nx typecheck ai-service`

The v1 runtime is proposal-first: chat can return `proposedActions`, but the AI service
does not mutate core-service state unless a future confirmed action endpoint is used.

## Internal indexing endpoints

The internal API now supports document indexing for AI search:

- `POST /api/internal/v1/ai/files/index` — index file pages for semantic search
- `POST /api/internal/v1/ai/files/ask` — query indexed files
- `POST /api/internal/v1/ai/wiki/index` — index wiki pages (used by core-service queue)
- `POST /api/internal/v1/ai/wiki/search` — search indexed wiki pages

If `DATABASE_URL` is set, the service stores embeddings in Postgres with pgvector.
Without a database, it falls back to an in-memory index.
