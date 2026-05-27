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
