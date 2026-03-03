@echo off
REM ============================================
REM FootballAI — Development Server (Windows)
REM ============================================
REM Usage:
REM   scripts\dev.bat          → All services
REM   scripts\dev.bat web      → Frontend only
REM   scripts\dev.bat services → Backend only
REM   scripts\dev.bat ml       → ML service only
REM   scripts\dev.bat full     → Everything

SET MODE=%1
IF "%MODE%"=="" SET MODE=full

IF "%MODE%"=="web" (
    echo Starting Web...
    pnpm dev:web
    GOTO :EOF
)

IF "%MODE%"=="services" (
    echo Starting Backend Services...
    pnpm dev:services
    GOTO :EOF
)

IF "%MODE%"=="ml" (
    echo Starting ML Service on port 8000...
    cd services\ml-service
    IF EXIST venv\Scripts\activate.bat (
        call venv\Scripts\activate.bat
    ) ELSE (
        echo No venv found. Run: pnpm setup
        GOTO :EOF
    )
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    GOTO :EOF
)

IF "%MODE%"=="full" (
    echo.
    echo  FootballAI — Full Stack
    echo.
    echo    Web        http://localhost:3100
    echo    Gateway    http://localhost:3000
    echo    Match      http://localhost:3001
    echo    Stats      http://localhost:3002
    echo    User       http://localhost:3003
    echo    ML         http://localhost:8000
    echo.
    pnpm dev:full
    GOTO :EOF
)

echo Usage: scripts\dev.bat [web^|services^|ml^|full]
