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

## Services

| Service | Port | Command |
|---------|------|---------|
| **Gateway** | 2991 | `pnpm nx serve gateway` |
| **Auth Service** | 2992 | `pnpm nx serve auth-service` |
| **API Service** | 2993 | `pnpm nx serve api-service` |
| **Notification Service** | 2994 | `pnpm nx serve notification-service` |
| **Analytics Service** | 2995 | `pnpm nx serve analytics-service` |
| **Realtime Service** | 2996 | `pnpm nx serve realtime-service` |
| **Web Frontend** | 2997 | `pnpm nx dev web` |

## Running Services Locally

**Prerequisites:** PostgreSQL running locally

```bash
# Terminal 1: Start PostgreSQL (macOS)
brew services start postgresql@16

# Terminal 2: Run migrations
pnpm nx run prisma:migrate

# Terminal 3: Start Auth Service
pnpm nx serve auth-service

# Terminal 4: Start API Service
pnpm nx serve api-service

# Terminal 5: Start Gateway
pnpm nx serve gateway

# Terminal 6: Start Web
pnpm nx dev web
```

## Common Commands

```bash
# Run a service
pnpm nx serve api-service

# Build a service
pnpm nx build api-service

# Test a service
pnpm nx test api-service

# Lint a service
pnpm nx lint api-service

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
├── api-service/           # Core API (port 2993)
├── notification-service/  # Notifications (port 2994)
├── analytics-service/     # Analytics (port 2995)
├── realtime-service/      # Real-time (port 2996)
└── web/                   # Next.js Frontend (port 2997)
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://serenity:serenity@postgres:5432/serenity?schema=public

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

## Troubleshooting

**Port already in use:**
```bash
lsof -i :2991
kill -9 <PID>
```

**PostgreSQL connection error:**
```bash
# Check if running
psql -U postgres

# Start PostgreSQL (macOS)
brew services start postgresql@16

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
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
| Testing | Jest, Playwright |
| Containers | Docker, Docker Compose |

## Resources

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Support

For issues, check [GitHub Issues](https://github.com/your-repo/issues) or contact the team.
