#!/usr/bin/env bash
# ============================================
# FootballAI — Development Server Launcher
# ============================================
# Usage:
#   ./scripts/dev.sh          → All services
#   ./scripts/dev.sh web      → Frontend only
#   ./scripts/dev.sh services → Backend services only
#   ./scripts/dev.sh ml       → ML service only
#   ./scripts/dev.sh full     → Everything
set -e

MODE=${1:-full}

start_ml() {
  echo "🐍 Starting ML Service (port 8000)..."
  cd services/ml-service
  if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
  elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
  else
    echo "⚠️  No venv found. Run 'pnpm setup' first."
    exit 1
  fi
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}

case $MODE in
  web)
    echo "🌐 Starting Web (port 3100)..."
    pnpm dev:web
    ;;
  services)
    echo "⚙️  Starting Backend Services..."
    pnpm dev:services
    ;;
  ml)
    start_ml
    ;;
  full)
    echo "⚽ Starting FootballAI — Full Stack"
    echo ""
    echo "   🌐 Web        → http://localhost:3100"
    echo "   🚪 Gateway    → http://localhost:3000"
    echo "   ⚽ Match      → http://localhost:3001"
    echo "   📊 Stats      → http://localhost:3002"
    echo "   👤 User       → http://localhost:3003"
    echo "   🤖 ML         → http://localhost:8000"
    echo ""
    pnpm dev:full
    ;;
  *)
    echo "Usage: ./scripts/dev.sh [web|services|ml|full]"
    exit 1
    ;;
esac
