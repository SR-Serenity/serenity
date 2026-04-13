# Serenity

A full-stack microservices monorepo built with Nx, NestJS, and Next.js.

## Architecture

```
serenity/
├── apps/
│   ├── gateway/               # API Gateway (port 2991)
│   ├── auth-service/          # Authentication service (port 2992)
│   ├── api-service/           # Core API service (port 2993)
│   ├── notification-service/  # Notifications (port 2994)
│   ├── analytics-service/     # Analytics (port 2995)
│   ├── realtime-service/      # Real-time features (port 2996)
│   ├── web/                   # Next.js frontend (port 2997)
│   └── *-e2e/                 # Playwright e2e test suites
├── packages/                  # Shared libraries (future)
└── infrastructure/
    ├── dev/                   # Development Docker setup
    └── prod/                  # Production Docker setup
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Nx 22, pnpm |
| Backend | NestJS 11, Node 20 |
| Frontend | Next.js 16, React 19, TypeScript 5.9 |
| Database | PostgreSQL 16 + Prisma |
| Bundler | Webpack + SWC |
| Testing | Jest, Playwright |
| Containers | Docker, Docker Compose |
| Reverse Proxy | Cloudflare Tunnel (production) |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm

## Development

Start all services with hot reload:

```sh
cd infrastructure/dev
docker compose up --build
```

**Service ports:**

| Service | Port |
|---------|------|
| Gateway | 2991 |
| Auth Service | 2992 |
| API Service | 2993 |
| Notification Service | 2994 |
| Analytics Service | 2995 |
| Realtime Service | 2996 |
| Web Frontend | 2997 |
| PostgreSQL | 5432 |

Source files are volume-mounted — changes trigger live reload without rebuilding images.

## Production

```sh
cd infrastructure/prod
cp .env.example .env   # fill in CLOUDFLARE_TUNNEL_TOKEN and any secrets
docker compose up --build -d
```

Production images use multi-stage builds:
- NestJS images copy only the compiled `dist/` and pruned `node_modules`
- Next.js image uses standalone output mode (~200 MB final image)
- All containers run as non-root user `nodejs:1001`
- `dumb-init` handles signal forwarding and graceful shutdown
- Cloudflare Tunnel exposes the application without opening inbound ports

## Nx Workspace

Install dependencies:

```sh
pnpm install
```

Common commands (always prefix with `pnpm nx`):

```sh
# Serve a specific app locally
pnpm nx serve gateway
pnpm nx dev web

# Build
pnpm nx build gateway
pnpm nx build web

# Run tests
pnpm nx test auth-service

# Lint
pnpm nx lint api-service

# Run e2e tests
pnpm nx e2e web-e2e

# Run tasks across all affected projects
pnpm nx affected -t build
pnpm nx affected -t test

# Visualize project graph
pnpm nx graph
```

## Infrastructure Details

### Development (`infrastructure/dev/`)

- **Dockerfile.nestjs** — installs all dependencies (including dev), runs `nx serve` for HMR
- **Dockerfile.nextjs** — installs all dependencies, runs `nx dev web` for HMR
- **docker-compose.yml** — mounts `apps/` for live reload; PostgreSQL health-checked before services start

### Production (`infrastructure/prod/`)

- **Dockerfile.nestjs** — multi-stage: builds with `nx build`, prunes dev deps, copies `dist/` only
- **Dockerfile.nextjs** — multi-stage: builds with Next.js standalone mode, final image ~200 MB
- **docker-compose.yml** — hardened config: `restart: always`, `no-new-privileges: true`, Cloudflare Tunnel

### Environment Variables

Key variables expected at runtime:

```env
# All NestJS services
PORT=3000
DATABASE_URL=postgresql://serenity:serenity@postgres:5432/serenity?schema=public
JWT_SECRET=replace-with-strong-secret
NODE_ENV=production

# Web frontend
NEXT_PUBLIC_API_URL=http://localhost:2991

# Production only
POSTGRES_USER=serenity
POSTGRES_PASSWORD=replace-with-strong-password
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
```

## Multi-tenant Auth MVP APIs

Gateway exposes these auth routes (proxied to `auth-service`):

```sh
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/organizations
POST /api/auth/organizations
POST /api/auth/switch-org
GET  /api/context
```

JWT payload includes `user_id` and `org_id` for tenant-aware downstream requests.

## CI / Nx Cloud

Connect to Nx Cloud for remote caching and distributed task execution:

```sh
pnpm nx connect
```

Keep TypeScript project references in sync:

```sh
pnpm nx sync          # update references
pnpm nx sync:check    # verify (use in CI)
```
