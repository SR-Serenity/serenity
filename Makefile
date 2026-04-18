.PHONY: help env-setup build-dev build-prod up up-dev up-prod down down-dev down-prod logs logs-dev logs-prod ps health restart clean clean-all

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
	@echo "  make logs-mongo         - View MongoDB logs"
	@echo ""
	@echo "Debugging (default: dev):"
	@echo "  make ps                 - Show running containers"
	@echo "  make health             - Check service health"
	@echo "  make shell-gateway      - Access gateway shell"
	@echo "  make mongo-shell        - Access MongoDB shell"
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
		echo "✓ Created .env from .env.example"; \
	else \
		echo "✗ .env already exists"; \
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
	@echo "✓ Services started"
	@echo "Gateway:    http://localhost:2991/api"
	@echo "Web UI:     http://localhost:2997"
	@echo "MongoDB:    localhost:27017"

up-prod:
	@echo "Starting production services..."
	docker compose -f infrastructure/prod/docker-compose.yml up -d
	@echo "✓ Services started"
	@echo "Verify Cloudflare tunnel: make logs-prod"

down: down-dev
down-dev:
	@echo "Stopping development services..."
	docker compose -f infrastructure/dev/docker-compose.yml down
	@echo "✓ Services stopped"

down-prod:
	@echo "Stopping production services..."
	docker compose -f infrastructure/prod/docker-compose.yml down
	@echo "✓ Services stopped"

logs: logs-dev
logs-dev:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f

logs-prod:
	docker compose -f infrastructure/prod/docker-compose.yml logs -f

logs-gateway:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f gateway

logs-mongo:
	docker compose -f infrastructure/dev/docker-compose.yml logs -f mongodb

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
	@docker compose -f infrastructure/dev/docker-compose.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" 2>/dev/null && echo "✓ MongoDB is healthy" || echo "✗ MongoDB is unhealthy"
	@curl -s http://localhost:2991/api >/dev/null 2>&1 && echo "✓ Gateway is healthy" || echo "✗ Gateway is unhealthy"
	@curl -s http://localhost:2997 >/dev/null 2>&1 && echo "✓ Web is healthy" || echo "✗ Web is unhealthy"

restart:
	@echo "Restarting development services..."
	docker compose -f infrastructure/dev/docker-compose.yml restart
	@echo "✓ Services restarted"

clean: clean-dev
clean-dev:
	@echo "Removing development containers..."
	docker compose -f infrastructure/dev/docker-compose.yml down
	@echo "✓ Containers removed (data preserved)"

clean-prod:
	@echo "Removing production containers..."
	docker compose -f infrastructure/prod/docker-compose.yml down
	@echo "✓ Containers removed (data preserved)"

clean-all:
	@echo "WARNING: This will delete all data in MongoDB!"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f infrastructure/dev/docker-compose.yml down -v; \
		docker compose -f infrastructure/prod/docker-compose.yml down -v; \
		echo "✓ All containers and volumes removed"; \
	else \
		echo "✗ Cancelled"; \
	fi

rebuild: clean build-dev up-dev

shell-gateway:
	docker compose -f infrastructure/dev/docker-compose.yml exec gateway sh

shell-auth:
	docker compose -f infrastructure/dev/docker-compose.yml exec auth-service sh

shell-api:
	docker compose -f infrastructure/dev/docker-compose.yml exec api-service sh

mongo-shell:
	docker compose -f infrastructure/dev/docker-compose.yml exec mongodb mongosh

test-api:
	@echo "Testing Gateway API..."
	@curl -v http://localhost:2991/api || echo "Gateway not responding"

backup-db:
	@echo "Backing up MongoDB..."
	@mkdir -p backups
	@docker compose -f infrastructure/dev/docker-compose.yml exec -T mongodb mongodump --out /backup
	@docker cp serenity-mongodb-dev:/backup ./backups/$$(date +%Y%m%d_%H%M%S)
	@echo "✓ Backup complete"
