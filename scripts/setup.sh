#!/usr/bin/env bash
# ============================================
# FootballAI — Initial Setup Script
# ============================================
set -e

echo "⚽ FootballAI — Setup Starting..."
echo ""

# 1. Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "❌ Node.js 22+ required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 2. Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
fi
echo "✅ pnpm $(pnpm -v)"

# 3. Check Python (for ML service)
if command -v python3 &> /dev/null; then
  PY_VERSION=$(python3 --version | cut -d' ' -f2)
  echo "✅ Python $PY_VERSION"
else
  echo "⚠️  Python 3.11+ not found. ML service won't run locally."
fi

# 4. Copy .env.example files if .env doesn't exist
echo ""
echo "📋 Setting up environment files..."

copy_env() {
  local dir=$1
  if [ -f "$dir/.env.example" ] && [ ! -f "$dir/.env" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "   ✅ $dir/.env created from .env.example"
  elif [ -f "$dir/.env" ]; then
    echo "   ⏭️  $dir/.env already exists, skipping"
  fi
}

copy_env "."
copy_env "apps/web"
copy_env "services/api-gateway"
copy_env "services/match-service"
copy_env "services/stats-service"
copy_env "services/user-service"
copy_env "services/ml-service"

# 5. Install dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
pnpm install

# 6. Generate Prisma client
echo ""
echo "🗄️  Generating Prisma client..."
pnpm db:generate

# 7. Setup ML service virtual environment
if command -v python3 &> /dev/null; then
  echo ""
  echo "🐍 Setting up ML service..."
  cd services/ml-service
  if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
  fi
  
  # Activate and install deps
  if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
  elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
  fi
  pip install -r requirements.txt --quiet
  echo "   ✅ Python dependencies installed"
  deactivate 2>/dev/null || true
  cd ../..
fi

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo ""
echo "Quick start:"
echo "  pnpm dev          → Start all services (Turbo)"
echo "  pnpm dev:web      → Start frontend only"
echo "  pnpm dev:services → Start backend services only"
echo "  pnpm dev:ml       → Start ML service only"
echo "  pnpm dev:full     → Start everything (web + services + ML)"
echo ""
echo "Database:"
echo "  pnpm db:studio    → Open Prisma Studio"
echo "  pnpm db:push      → Push schema to database"
echo "  pnpm db:seed      → Seed database"
echo ""
echo "⚠️  Don't forget to update your .env files with real API keys!"
echo "============================================"
