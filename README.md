# Serenity

A full-stack microservices monorepo built with Nx, NestJS, and Next.js.

## Prerequisites

- **Node.js**: 20+ 
- **Docker & Docker Compose**
- **pnpm**: 9+

## Quick Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start everything with Docker
cd infrastructure/dev
docker compose up --build
```

Access:
- **Web**: http://localhost:2997
- **API Gateway**: http://localhost:2991
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Services

| Service | Port | Command |
|---------|------|---------|
| **Gateway** | 2991 | `pnpm nx serve gateway` |
| **Auth Service** | 2992 | `pnpm nx serve auth-service` |
| **Core Service** | 2993 | `pnpm nx serve core-service` |
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

# Terminal 5: Start web frontend
pnpm nx dev web
```

### Run Multiple Services With Nx

Nx supports running multiple services at once via `run-many`.

```bash
# Run selected services in parallel
pnpm nx run-many -t serve --projects=gateway,auth-service,core-service --parallel=3

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

# Lint a service
pnpm nx lint core-service

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
# Run migrations
pnpm nx run prisma:migrate

# Seed database
pnpm nx run prisma:seed

# Open Prisma Studio
pnpm nx run prisma:studio
```

## Architecture

```
apps/
├── gateway/               # API Gateway (port 2991)
├── auth-service/          # Authentication (port 2992)
├── core-service/          # Core API (port 2993)
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

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:2991
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
| Frontend | Next.js 16, React 19 |
| Database | PostgreSQL 16 + Prisma |
| Realtime Transport | Redis 7 Pub/Sub |
| Testing | Jest, Playwright |
| Containers | Docker, Docker Compose |

## Resources

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Support

For issues, check [GitHub Issues](https://github.com/your-repo/issues) or contact the team.
## Support

For issues, check [GitHub Issues](https://github.com/your-repo/issues) or contact the team.
your-repo/issues) or contact the team.
your-repo/issues) or contact the team.
