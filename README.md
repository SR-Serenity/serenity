# Serenity

A full-stack workspace platform monorepo built with Nx, NestJS, Next.js, Prisma, and a FastAPI-based AI service.

## Prerequisites

- **Node.js**: 20+
- **Docker & Docker Compose**
- **pnpm**: 10+
- **Python**: 3.12+
- **Poetry**: required for `apps/ai-service`

## Quick Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start the Docker-backed development stack
cd infrastructure/dev
docker compose up --build
```

Access:
- **Web**: http://localhost:2997
- **API Gateway**: http://localhost:2991
- **AI Service**: http://localhost:8001 when started locally
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

The development Docker Compose stack currently runs the Node services, web app, PostgreSQL, and Redis. Run `ai-service` locally with Nx/Poetry when working on AI features.

## Services

| Service | Port | Command |
|---------|------|---------|
| **Gateway** | 2991 | `pnpm nx serve gateway` |
| **Auth Service** | 2992 | `pnpm nx serve auth-service` |
| **Core Service** | 2993 | `pnpm nx serve core-service` |
| **AI Service** | 8001 | `pnpm nx serve ai-service` |
| **Realtime Service** | 2996 | `pnpm nx serve realtime-service` |
| **Web Frontend** | 2997 | `pnpm nx dev web` |

## Running Services Locally

**Prerequisites:** PostgreSQL and Redis running locally

```bash
# Terminal 1: Start PostgreSQL and Redis with Docker
make up-infra

# Terminal 2: Run migrations
pnpm prisma:migrate:dev

# Terminal 3: Start core backend services together (parallel)
pnpm nx run-many -t serve --projects=auth-service,core-service,gateway --parallel=3

# Terminal 4: Start optional supporting services together (parallel)
pnpm nx run-many -t serve --projects=realtime-service --parallel=1

# Terminal 5: Start AI service when using Serenity AI
cp apps/ai-service/.env.example apps/ai-service/.env
pnpm nx serve ai-service

# Terminal 6: Start web frontend
pnpm nx dev web
```

### Run Multiple Services With Nx

Nx supports running multiple services at once via `run-many`.

```bash
# Run selected services in parallel
pnpm nx run-many -t serve --projects=gateway,auth-service,core-service --parallel=3

# Run backend services plus AI in parallel
pnpm nx run-many -t serve --projects=gateway,auth-service,core-service,ai-service --parallel=4

# Run all projects that have a serve target
pnpm nx run-many -t serve --all --parallel=6

# See which projects support serve
pnpm nx show projects --withTarget serve
```

Tip: press `Ctrl+C` in the terminal to stop all services started by that `run-many` command.

## Common Commands

```bash
# Run a service
pnpm nx serve core-service

# Build a service
pnpm nx build core-service

# Test a service
pnpm nx test core-service

# Test the AI service
pnpm nx test ai-service

# Lint a service
pnpm nx lint core-service

# Typecheck the AI service
pnpm nx typecheck ai-service

# Run all tests
pnpm nx run-many --target=test --all

# View project graph
pnpm nx graph
```

## Docker Commands

```bash
# Start all services
docker compose up --build

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f auth-service

# Restart a service
docker compose restart auth-service
```

## Database

```bash
# Run Prisma migrations
pnpm prisma:migrate:dev

# Generate Prisma client
pnpm prisma:generate

# Open Prisma Studio
pnpm prisma:studio
```

## Architecture

```
apps/
├── gateway/               # API Gateway (port 2991)
├── auth-service/          # Authentication (port 2992)
├── core-service/          # Core API (port 2993)
├── ai-service/            # FastAPI AI orchestration service (port 8001)
├── realtime-service/      # Real-time (port 2996)
└── web/                   # Next.js Frontend (port 2997)
```

### NestJS service module layout

Each NestJS service now uses:

```
src/
├── main.ts
├── app.module.ts
└── <module>/
    ├── <module>.module.ts
    ├── ...controller.ts
    ├── ...service.ts
    ├── config/
    │   ├── enums/
    │   └── types/
    ├── dto/
    └── strategies/
```

### AI service layout

`apps/ai-service` is a FastAPI application that exposes internal AI endpoints under `/api/internal/v1`. It handles workspace Q&A, document understanding, guardrails, intent routing, proposed actions, and Langfuse tracing hooks. The v1 runtime is proposal-first: AI responses can include `proposedActions`, but the AI service does not directly mutate core-service state.

The service loads configuration from `apps/ai-service/.env`; the repository root `.env` is intentionally ignored by the Python runtime.

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://serenity:serenity@localhost:5432/serenity?schema=public
DIRECT_URL=postgresql://serenity:serenity@localhost:5432/serenity?schema=public

# Realtime
REDIS_URL=redis://localhost:6379

# Services
NODE_ENV=development
JWT_SECRET=your-secret-key
PORT=3000
API_SERVICE_URL=http://localhost:2993/api
AI_SERVICE_URL=http://localhost:8001/api/internal/v1
AI_INTERNAL_API_TOKEN=dev-internal-token

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:2991

# AI service (apps/ai-service/.env)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
CORE_SERVICE_BASE_URL=http://localhost:2993/api
INTERNAL_API_TOKEN=dev-internal-token
```

## Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:2991/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "organizationName": "My Org"
  }'

# 2. Login
curl -X POST http://localhost:2991/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
# Response: { "access_token": "eyJ..." }

# 3. Use token in requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:2991/api/auth/context
```

## Frontend Style Guide

- CSS/Tailwind conventions: [`docs/frontend-style-conventions.md`](docs/frontend-style-conventions.md)

## Troubleshooting

**Port already in use:**
```bash
lsof -i :2991
kill -9 <PID>
```

**PostgreSQL or Redis connection error:**
```bash
# Check if running
docker compose -f infrastructure/dev/docker-compose.yml ps

# Start local dependencies
make up-infra
```

**Clear cache:**
```bash
pnpm nx reset
pnpm install
```

**Docker issues:**
```bash
# Rebuild images
docker compose build --no-cache

# Reset everything
docker compose down -v
docker compose up --build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Nx 22 |
| Backend | NestJS 11 |
| AI Service | FastAPI, LangGraph, LangChain, Langfuse |
| Frontend | Next.js 16, React 19 |
| Database | PostgreSQL 16 + Prisma |
| Realtime Transport | Redis 7 Pub/Sub |
| Testing | Jest, Pytest, Playwright |
| Containers | Docker, Docker Compose |

## Resources

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Support

For issues, check [GitHub Issues](https://github.com/your-repo/issues) or contact the team.
## Support

For issues, check [GitHub Issues](https://github.com/your-repo/issues) or contact the team.
your-repo/issues) or contact the team.
your-repo/issues) or contact the team.
