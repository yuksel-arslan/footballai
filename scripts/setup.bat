@echo off
REM ============================================
REM FootballAI — Initial Setup (Windows)
REM ============================================
echo FootballAI — Setup Starting...
echo.

REM 1. Check Node.js
node -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo Node.js not found. Install Node.js 22+ from https://nodejs.org
    EXIT /B 1
)
echo Node.js: 
node -v

REM 2. Check pnpm
pnpm -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo Installing pnpm...
    corepack enable
    corepack prepare pnpm@9.15.0 --activate
)
echo pnpm: 
pnpm -v

REM 3. Copy .env files
echo.
echo Setting up environment files...

IF NOT EXIST ".env" IF EXIST ".env.example" (
    copy .env.example .env >nul
    echo    .env created
)
IF NOT EXIST "apps\web\.env" IF EXIST "apps\web\.env.example" (
    copy apps\web\.env.example apps\web\.env >nul
    echo    apps\web\.env created
)
FOR %%s IN (api-gateway match-service stats-service user-service ml-service) DO (
    IF NOT EXIST "services\%%s\.env" IF EXIST "services\%%s\.env.example" (
        copy "services\%%s\.env.example" "services\%%s\.env" >nul
        echo    services\%%s\.env created
    )
)

REM 4. Install Node dependencies
echo.
echo Installing Node.js dependencies...
call pnpm install

REM 5. Generate Prisma
echo.
echo Generating Prisma client...
call pnpm db:generate

REM 6. Setup ML venv
echo.
python --version >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo Setting up ML service...
    cd services\ml-service
    IF NOT EXIST "venv" (
        python -m venv venv
        echo    Virtual environment created
    )
    call venv\Scripts\activate.bat
    pip install -r requirements.txt --quiet
    echo    Python dependencies installed
    call deactivate
    cd ..\..
) ELSE (
    echo Python not found. ML service won't run locally.
)

echo.
echo ============================================
echo Setup complete!
echo.
echo Quick start:
echo   pnpm dev          Start all services
echo   pnpm dev:web      Start frontend only
echo   pnpm dev:services Start backend services only
echo   pnpm dev:full     Start everything
echo.
echo Don't forget to update .env files with real API keys!
echo ============================================
