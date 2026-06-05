.PHONY: help env-setup build-dev build-prod up up-dev up-prod up-infra down down-dev down-prod logs logs-dev logs-prod logs-postgres logs-redis ps health restart clean clean-all

help:
	@echo "Serenity Docker Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make env-setup          - Copy .env.example to .env"
	@echo ""
	@echo "Building:"
	@echo "  make build-dev          - Build development images"
	@echo "  make build-prod         - Build production images"
	@echo ""
	@echo "Running (default: dev):"
	@echo "  make up                 - Start development services"
	@echo "  make up-dev             - Start development services"
	@echo "  make up-infra           - Start local PostgreSQL and Redis only"
	@echo "  make up-prod            - Start production services"
	@echo "  make down               - Stop development services"
	@echo "  make down-dev           - Stop development services"
	@echo "  make down-prod          - Stop production services"
	@echo ""
	@echo "Logs (default: dev):"
	@echo "  make logs               - View development logs"
	@echo "  make logs-dev           - View development logs"
	@echo "  make logs-prod          - View production logs"
	@echo "  make logs-gateway       - View gateway logs"
	@echo "  make logs-postgres      - View PostgreSQL logs"
	@echo "  make logs-redis         - View Redis logs"
	@echo ""
	@echo "Debugging (default: dev):"
	@echo "  make ps                 - Show running containers"
	@echo "  make health             - Check service health"
	@echo "  make shell-gateway      - Access gateway shell"
	@echo "  make postgres-shell     - Access PostgreSQL shell"
	@echo "  make redis-shell        - Access Redis shell"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean              - Remove development containers"
	@echo "  make clean-prod         - Remove production containers"
	@echo "  make clean-all          - Remove all containers and volumes"
	@echo "  make rebuild            - Clean and rebuild development"
	@echo ""
	@echo "Testing:"
	@echo "  make test-api           - Test gateway API endpoint"

env-setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example"; \
	else \
		echo ".env already exists"; \
	fi

build-dev:
	@echo "Building development images..."
	docker compose -f infrastructure/dev/docker-compose.yml build

build-prod:
	@echo "Building production images..."
	docker compose -f infrastructure/prod/docker-compose.yml build

up: up-dev
up-dev:
	@echo "Starting development services..."
	docker compose -f infrastructure/dev/docker-compose.yml up -d
	@echo "Services started"
	@echo "Gateway:    http://localhost:2991/api"
	@echo "Web UI:     http://localhost:2997"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis:      localhost:6379"

up-infra:
	@echo "Starting local PostgreSQL and Redis..."
	docker compose -f infrastructure/dev/docker-compose.yml up -d postgres redis
	@echo "Local infrastructure started"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis:      localhost:6379"

up-prod:
	@echo "Starting production services..."
	docker compose -f infrastructure/prod/docker-compose.yml up -d
	@echo "Services started"
	@echo "Verify Cloudflare tunnel: make logs-prod"

down: down-dev
down-dev:
	@echo "Stopping development services..."
	docker compose -f infrastructure/dev/docker-compose.yml down
	@echo "Services stopped"

down-prod:
	@echo "Stopping production services..."
	docker compose -f infrastructure/prod/docker-compose.yml down
	@echo "Services stopped"

logs: logs-dev
logs-dev:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f

logs-prod:
	docker compose -f infrastructure/prod/docker-compose.yml logs -f

logs-gateway:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f gateway

logs-postgres:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f postgres

logs-redis:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f redis

ps:
	@echo "=== Development Services ==="
	@docker compose -f infrastructure/dev/docker-compose.yml ps 2>/dev/null || echo "Dev services not running"
	@echo ""
	@echo "=== Production Services ==="
	@docker compose -f infrastructure/prod/docker-compose.yml ps 2>/dev/null || echo "Prod services not running"

health:
	@echo "Checking development service health..."
	@docker compose -f infrastructure/dev/docker-compose.yml ps
	@echo ""
	@echo "Testing connections..."
	@docker compose -f infrastructure/dev/docker-compose.yml exec -T postgres pg_isready -U serenity -d serenity 2>/dev/null && echo "PostgreSQL is healthy" || echo "PostgreSQL is unhealthy"
	@docker compose -f infrastructure/dev/docker-compose.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && echo "Redis is healthy" || echo "Redis is unhealthy"
	@curl -s http://localhost:2991/api >/dev/null 2>&1 && echo "Gateway is healthy" || echo "Gateway is unhealthy"
	@curl -s http://localhost:2997 >/dev/null 2>&1 && echo "Web is healthy" || echo "Web is unhealthy"

restart:
	@echo "Restarting development services..."
	docker compose -f infrastructure/dev/docker-compose.yml restart
	@echo "Services restarted"

clean: clean-dev
clean-dev:
	@echo "Removing development containers..."
	docker compose -f infrastructure/dev/docker-compose.yml down
	@echo "Containers removed (data preserved)"

clean-prod:
	@echo "Removing production containers..."
	docker compose -f infrastructure/prod/docker-compose.yml down
	@echo "Containers removed (data preserved)"

clean-all:
	@echo "WARNING: This will delete all PostgreSQL and Redis data!"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f infrastructure/dev/docker-compose.yml down -v; \
		docker compose -f infrastructure/prod/docker-compose.yml down -v; \
		echo "All containers and volumes removed"; \
	else \
		echo "Cancelled"; \
	fi

rebuild: clean build-dev up-dev

shell-gateway:
	docker compose -f infrastructure/dev/docker-compose.yml exec gateway sh

shell-auth:
	docker compose -f infrastructure/dev/docker-compose.yml exec auth-service sh

shell-api:
	docker compose -f infrastructure/dev/docker-compose.yml exec core-service sh

postgres-shell:
	docker compose -f infrastructure/dev/docker-compose.yml exec postgres psql -U serenity -d serenity

redis-shell:
	docker compose -f infrastructure/dev/docker-compose.yml exec redis redis-cli

test-api:
	@echo "Testing Gateway API..."
	@curl -v http://localhost:2991/api || echo "Gateway not responding"

backup-db:
	@echo "Backing up PostgreSQL..."
	@mkdir -p backups
	@docker compose -f infrastructure/dev/docker-compose.yml exec -T postgres pg_dump -U serenity serenity > backups/serenity_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup complete"
