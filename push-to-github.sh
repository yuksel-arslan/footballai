#!/bin/bash

# FootballAI - GitHub Push Script
# Repo: https://github.com/yuksel-arslan/footballai.git

echo "🚀 Starting Git setup and push..."

# Git yapılandırması
echo "📝 Setting up Git config..."
git config user.name "Yuksel Arslan"
git config user.email "yuksel@yukselarslan.com"

# Tüm dosyaları stage'e ekle
echo "📦 Adding all files..."
git add .

# Status kontrolü
echo "📊 Current status:"
git status --short

# İlk commit
echo "💾 Creating initial commit..."
git commit -m "feat: initial project setup

🏗️ Architecture:
- Turborepo monorepo structure
- Database schema with 16 Prisma models
- Next.js 16 frontend with Tailwind CSS 3.4
- Match Service backend (Express.js)

✅ Completed:
- apps/web: Next.js 16 frontend (8+ components)
- packages/database: Prisma schema + client
- packages/typescript-config: Shared TS configs
- services/match-service: Backend service with API-Football integration

📊 Features:
- API-Football integration with caching
- Redis caching layer (Upstash)
- PostgreSQL database (Neon)
- TypeScript strict mode
- Prettier + ESLint configuration

📚 Documentation:
- CLAUDE_CODE_GUIDE.md: Comprehensive development guide
- SERVICES.md: Microservices documentation
- FRONTEND_DESIGN_PRINCIPLES.md: UI/UX guidelines
- FOOTBALL_PREDICTION_TECHNICAL_SPEC.md: Technical specification

🎯 Tech Stack:
- Frontend: Next.js 16, TypeScript, Tailwind CSS 3.4, shadcn/ui
- Backend: Node.js 22, Express.js, Prisma ORM
- Database: PostgreSQL (Neon), Redis (Upstash)
- ML: Python 3.11, FastAPI, XGBoost (coming soon)

💰 Cost: \$39/month (Vercel Free + Railway + Neon)

📈 Status: Phase 1 MVP - Core setup complete
🚧 Next: Stats Service, User Service, ML Service"

# Remote repository ekle
echo "🔗 Adding remote repository..."
git remote add origin https://github.com/yuksel-arslan/footballai.git

# Remote kontrolü
echo "📡 Remote configuration:"
git remote -v

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository: https://github.com/yuksel-arslan/footballai"
echo ""
echo "🎯 Next steps:"
echo "1. Visit: https://github.com/yuksel-arslan/footballai"
echo "2. Open with Claude Code"
echo "3. Start development!"
echo ""
echo "📚 Read CLAUDE_CODE_GUIDE.md for development workflow"
