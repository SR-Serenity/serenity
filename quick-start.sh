#!/bin/bash

set -e

echo "================================"
echo "Serenity Docker Quick Start"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "✗ Docker Compose is not available."
    exit 1
fi

# Setup environment file if not exists
if [ ! -f .env ]; then
    echo "Setting up .env file..."
    cp .env.example .env
    echo "✓ Created .env from .env.example"
fi

# Build images
echo ""
echo "Building Docker images..."
docker compose build

# Start services
echo ""
echo "Starting services..."
docker compose up -d

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 5

# Check health
echo ""
echo "================================"
echo "Checking service status..."
echo "================================"
docker compose ps

echo ""
echo "✓ Services are starting!"
echo ""
echo "Access your services:"
echo "  API Gateway:  http://localhost:2991/api"
echo "  Web UI:       http://localhost:2997"
echo "  MongoDB:      localhost:27017"
echo ""
echo "Useful commands:"
echo "  make logs              - View all logs"
echo "  make logs-gateway      - View gateway logs"
echo "  docker-compose ps      - Check service status"
echo "  make mongo-shell       - Access MongoDB"
echo "  make down              - Stop all services"
echo ""
