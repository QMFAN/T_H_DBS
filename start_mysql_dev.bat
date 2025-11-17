@echo off
setlocal enableextensions
REM Start MySQL dev container
cd /d "%~dp0"

REM Detect docker compose command
docker compose version >nul 2>&1
if %errorlevel% EQU 0 (
    set "COMPOSE_CMD=docker compose"
) else (
    docker-compose --version >nul 2>&1
    if %errorlevel% EQU 0 (
        set "COMPOSE_CMD=docker-compose"
    ) else (
        echo Docker CLI not found. Make sure Docker Desktop is installed, running, and added to PATH.
        pause
        exit /b 1
    )
)

if "%COMPOSE_CMD%"=="docker compose" (
    docker compose -f docker-compose.dev.yml up -d mysql
) else (
    docker-compose -f docker-compose.dev.yml up -d mysql
)

if %errorlevel% NEQ 0 (
    echo Failed to start dev MySQL container. Check Docker status and docker-compose.dev.yml configuration.
    pause
    exit /b %errorlevel%
)

echo Dev MySQL container is running on host port 3308.
pause
