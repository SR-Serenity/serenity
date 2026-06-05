# Infrastructure Configuration

This folder contains all Docker and deployment configurations for the Serenity project, organized by environment.

## 📁 Structure

```
infrastructure/
├── dev/                    # Development environment
│   ├── Dockerfile.nestjs  # NestJS dev container (live reload)
│   ├── Dockerfile.nextjs  # Next.js dev container (hot reload)
│   └── docker-compose.yml # Development orchestration
├── prod/                   # Production environment
│   ├── Dockerfile.nestjs  # NestJS prod container (optimized)
│   ├── Dockerfile.nextjs  # Next.js prod container (optimized)
│   └── docker-compose.yml # Production orchestration
└── README.md              # This file
```

## 🚀 Quick Start

### Development Environment

```bash
# Build and start development containers with live reload
docker-compose -f infrastructure/dev/docker-compose.yml up -d

# View logs
docker-compose -f infrastructure/dev/docker-compose.yml logs -f

# Stop
docker-compose -f infrastructure/dev/docker-compose.yml down
```

### Production Environment

```bash
# Build and start production containers
docker-compose -f infrastructure/prod/docker-compose.yml up -d

# View logs
docker-compose -f infrastructure/prod/docker-compose.yml logs -f

# Stop
docker-compose -f infrastructure/prod/docker-compose.yml down
```

## 🔄 Key Differences: Dev vs Prod

### Development
| Feature | Description |
|---------|-------------|
| **Images** | Larger, includes dev tools |
| **Build** | Fast, skips optimizations |
| **Live Reload** | ✅ Hot module replacement enabled |
| **Volumes** | ✅ Source code mounted for live changes |
| **Debugging** | ✅ Debug tools included |
| **Logging** | Verbose, includes DEBUG statements |
| **Cloudflare** | ❌ Disabled |
| **Security** | Standard |
| **Restart** | `unless-stopped` |

### Production
| Feature | Description |
|---------|-------------|
| **Images** | Multi-stage, optimized (~50% smaller) |
| **Build** | Full optimization, tree-shaking |
| **Live Reload** | ❌ Not needed |
| **Volumes** | ❌ Code compiled into image |
| **Debugging** | Minimal, only critical logs |
| **Logging** | Quiet, errors only |
| **Cloudflare** | ✅ Tunnel enabled |
| **Security** | Hardened: no-new-privileges, minimal tools |
| **Restart** | `always` |

## 📦 Development Dockerfile.nestjs

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci  # Install all deps including dev

COPY . .
RUN npm install -g @nestjs/cli  # Dev tools

USER nodejs
EXPOSE 3000

# Live reload with nx serve
CMD ["npm", "exec", "nx", "serve", "${SERVICE_NAME}"]
```

**Why this approach:**
- ✅ Fast rebuilds on code changes
- ✅ Full source code available for debugging
- ✅ Dev dependencies (ts-node, ts-jest, etc.) included
- ✅ Supports hot module replacement
- ⚠️ Larger image (not for production)

## 🏗️ Production Dockerfile.nestjs

```dockerfile
# Build stage
FROM node:20-alpine AS builder
...
RUN npm ci --prefer-offline --no-audit
RUN npm exec nx build ${SERVICE_NAME}
RUN npm prune --production  # Remove dev deps

# Runtime stage - minimal image
FROM node:20-alpine
...
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# No dev dependencies, no build tools
```

**Why this approach:**
- ✅ Multi-stage = smaller final image
- ✅ Production dependencies only (~50% smaller)
- ✅ No build tools or dev dependencies
- ✅ Security hardening applied
- ✅ Optimized runtime performance

## 🐳 Docker Compose Differences

### Development
```yaml
volumes:
  - ../../../apps:/app/apps  # Mount source for live reload

restart: unless-stopped
# Services restart when you stop them manually
```

### Production
```yaml
restart: always
# Services restart automatically on failure

security_opt:
  - no-new-privileges:true
# Prevent privilege escalation

healthcheck:
  test: [...]
  interval: 30s  # Longer checks
  timeout: 10s
```

## 🔐 Security Notes

### Production Hardening
1. **Multi-stage builds** - Only runtime dependencies in final image
2. **No new privileges** - Prevents privilege escalation
3. **Non-root user** - Containers run as `nodejs:nodejs` user
4. **Minimal tools** - No shell, no build tools
5. **Dumb-init** - Proper signal handling for graceful shutdowns
6. **Read-only where possible** - Limits attack surface

### Development Trade-offs
- Larger images (includes dev dependencies)
- More tools available (debugging)
- Source code mounted (easier to attack locally, but acceptable for dev)

## 📝 Environment Variables

### Development (.env)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://serenity:serenity@postgres:5432/serenity?schema=public
DIRECT_URL=postgresql://serenity:serenity@postgres:5432/serenity?schema=public
REDIS_URL=redis://redis:6379
DEBUG=serenity:*
NEXT_PUBLIC_API_URL=http://localhost:2991
NEXT_PUBLIC_REALTIME_URL=http://localhost:2996
```

### Production (.env)
```bash
NODE_ENV=production
POSTGRES_USER=serenity
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://serenity:change-me@postgres:5432/serenity?schema=public
REDIS_URL=redis://redis:6379
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoixxxxxxxx...
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## 🚢 Production Deployment

### Prerequisites
1. `.env` file with `CLOUDFLARE_TUNNEL_TOKEN`
2. Docker & Docker Compose installed
3. Cloudflare account with tunnel created

### Steps
```bash
# 1. Copy environment template
cp ../../.env.example .env

# 2. Set production values
nano .env

# 3. Build images (tag with version)
docker-compose -f docker-compose.yml build \
  --build-arg SERVICE_NAME=core-service

# 4. Start services
docker-compose -f docker-compose.yml up -d

# 5. Verify tunnel connected
docker-compose logs cloudflared

# 6. Check health
docker-compose ps
```

## 🧪 Testing Different Environments

### Test Development Build
```bash
docker-compose -f infrastructure/dev/docker-compose.yml up -d
curl http://localhost:2991/api
```

### Test Production Build
```bash
docker-compose -f infrastructure/prod/docker-compose.yml up -d
curl http://localhost:2991/api
```

### Compare Image Sizes
```bash
# Development images (larger)
docker images | grep dev

# Production images (smaller)
docker images | grep latest
```

## 📚 Commands

### Using development setup
```bash
# Start
cd infrastructure/dev
docker-compose up -d

# View logs
docker-compose logs -f gateway

# Rebuild
docker-compose build --no-cache

# Stop
docker-compose down
```

### Using production setup
```bash
# Start
cd infrastructure/prod
docker-compose up -d

# With Cloudflare
CLOUDFLARE_TUNNEL_TOKEN=xxx docker-compose up -d

# Check tunnel
docker-compose logs cloudflared
```

## 🔧 Customization

### Add New Service
1. Add Dockerfile.service to `dev/` and `prod/`
2. Add service configuration to both `docker-compose.yml` files
3. Ensure consistent port mappings (2991-2997)

### Modify Ports
1. Update `docker-compose.yml` entries
2. Update `.env.example`
3. Remember external:internal mapping (e.g., `2991:3000`)

## ❓ FAQ

**Q: Why separate Dockerfiles?**
A: Dev needs source code mounted and dev tools. Prod needs optimized, secure, minimal images.

**Q: Why are volumes only in dev?**
A: Production uses compiled code in the image. Dev mounts source for live reload.

**Q: Can I use prod images in development?**
A: Yes, but you won't have live reload. Use dev setup for active development.

**Q: Should I commit infrastructure files?**
A: Yes! Commit the Dockerfiles and docker-compose.yml. They're team configuration, not secrets.

**Q: What about .env files?**
A: Never commit! Use `.env.example` as template. Create local `.env` with real values.

## 🔗 References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Security](https://nodejs.org/en/docs/guides/nodejs-docker-dockerfile/)
