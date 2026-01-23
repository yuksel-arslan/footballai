#!/bin/bash

# Git yapılandırması (kendi bilgilerinizle değiştirin)
git config user.name "Yuksel Arslan"
git config user.email "yuksel@yukselarslan.com"

# Tüm dosyaları stage'e ekle
git add .

# İlk commit
git commit -m "feat: initial project setup

- Turborepo monorepo structure
- Database schema with 14 Prisma models
- Next.js 15 frontend with Tailwind CSS
- Match Service backend (Express.js)
- API-Football integration
- Redis caching
- Complete documentation for Claude Code

Components:
- apps/web: Next.js 15 frontend
- packages/database: Prisma schema
- services/match-service: Backend service
- Documentation: CLAUDE_CODE_GUIDE.md, SERVICES.md"

# Remote repository ekle (kendi repo URL'inizi kullanın)
git remote add origin https://github.com/yuksel-arslan/futball-ai.git

# Push to GitHub
git push -u origin main

echo "✅ Pushed to GitHub successfully!"
