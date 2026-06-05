@echo off
setlocal enabledelayedexpansion

echo.
echo ================================
echo Serenity Docker Quick Start
echo ================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo X Docker is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Setting up .env file...
    copy .env.example .env
    echo ^ Created .env from .env.example
)

REM Build images
echo.
echo Building Docker images...
call docker-compose build
if errorlevel 1 (
    echo X Build failed
    exit /b 1
)

REM Start services
echo.
echo Starting services...
call docker-compose up -d
if errorlevel 1 (
    echo X Failed to start services
    exit /b 1
)

REM Wait for services
echo.
echo Waiting for services to start...
timeout /t 5 /nobreak

REM Show status
echo.
echo ================================
echo Checking service status...
echo ================================
docker-compose ps

echo.
echo ^ Services are starting!
echo.
echo Access your services:
echo   API Gateway:  http://localhost:2991/api
echo   Web UI:       http://localhost:2997
echo   PostgreSQL:   localhost:5432
echo   Redis:        localhost:6379
echo.
echo Useful commands:
echo   make logs              - View all logs
echo   make logs-gateway      - View gateway logs
echo   docker-compose ps      - Check service status
echo   make postgres-shell    - Access PostgreSQL
echo   make redis-shell       - Access Redis
echo   docker-compose down    - Stop all services
echo.
pause
