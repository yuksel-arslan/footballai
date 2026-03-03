# Production Deployment Checklist

## Environment Variables

- [ ] DATABASE_URL (Neon)
- [ ] REDIS_URL (Upstash)
- [ ] JWT_SECRET (min 32 chars)
- [ ] GEMINI_API_KEY
- [ ] FOOTBALL_DATA_KEY
- [ ] API_FOOTBALL_KEY
- [ ] FRONTEND_URL (https://footballai.io)
- [ ] ML_SERVICE_URL

## Vercel (Frontend)

- [ ] Framework: Next.js
- [ ] Build command: pnpm --filter @football-ai/database db:generate && pnpm --filter web build
- [ ] Domain: footballai.io configured
- [ ] Environment variables set

## Railway (Backend Services)

- [ ] match-service deployed (Railpack)
- [ ] api-gateway deployed (Railpack)
- [ ] stats-service deployed (Railpack)
- [ ] user-service deployed (Railpack)
- [ ] ml-service deployed (Docker)
- [ ] Health checks passing (/health)
- [ ] Cron jobs running (fixture sync, standings sync)

## Database

- [ ] Prisma migrations applied
- [ ] Seed data loaded (optional)
- [ ] Backup strategy configured

## Security

- [ ] CORS whitelist (footballai.io only)
- [ ] Rate limiting active
- [ ] JWT secret rotated from development
- [ ] HTTPS enforced
- [ ] Auth middleware active

## Monitoring

- [ ] Health check endpoints responding
- [ ] Pino structured logging active
- [ ] Error boundaries on all pages
