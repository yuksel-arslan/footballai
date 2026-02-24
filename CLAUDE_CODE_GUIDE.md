# FootballAI - Claude Code Development Guide

Bu dokümantasyon, projeyi Claude Code ile geliştirmek için hazırlanmıştır.

## 📋 PROJE DURUMU

### ✅ Tamamlanan
1. **Repository Setup**
   - Turborepo monorepo yapısı
   - pnpm workspace
   - TypeScript configurations
   - Prettier, ESLint

2. **Database Schema**
   - 14 model (Prisma)
   - İlişkiler tanımlı
   - Index'ler optimize edildi
   - Location: `packages/database/prisma/schema.prisma`

3. **Next.js Frontend**
   - Next.js 15 + App Router
   - Tailwind CSS v4
   - shadcn/ui inspired components
   - Mock data ile çalışan temel UI
   - Location: `apps/web/`

4. **Match Service (Backend)**
   - Express.js server
   - API-Football integration
   - Redis caching
   - Fixture endpoints
   - Location: `services/match-service/`

### 🚧 Devam Eden / Sonraki
1. **Stats Service** (Priority: High)
2. **User Service** (Priority: High)
3. **ML Service** (Priority: Medium)
4. **API Gateway** (Priority: Medium)
5. **Frontend-Backend Integration** (Priority: High)

---

## 🏗️ ARCHITECTURE

```
football-ai/
├── apps/
│   └── web/                    # Next.js 15 frontend
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   ├── components/    # React components
│       │   ├── lib/           # Utilities
│       │   └── types/         # TypeScript types
│       └── package.json
│
├── packages/
│   ├── database/              # Prisma schema
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/index.ts       # Prisma client export
│   └── typescript-config/     # Shared TS configs
│
└── services/
    ├── match-service/         # Port 3001 ✅
    ├── stats-service/         # Port 3002 (TODO)
    ├── user-service/          # Port 3003 (TODO)
    ├── ml-service/            # Port 8000 (TODO)
    └── api-gateway/           # Port 3000 (TODO)
```

---

## 🎯 DEVELOPMENT PRIORITIES

### Phase 1: Core Backend Services (Week 1-2)

#### 1.1 Stats Service (services/stats-service/)
**Purpose:** Team/player statistics, league standings, H2H records

**Endpoints:**
```typescript
GET  /api/stats/teams/:id
GET  /api/stats/teams/:id/form
GET  /api/stats/compare?team1=:id1&team2=:id2
GET  /api/stats/leagues/:id/standings
GET  /api/stats/h2h/:team1/:team2
```

**Key Files:**
- `src/index.ts` - Express server
- `src/controllers/stats-controller.ts`
- `src/services/stats-service.ts`
- `src/services/api-football.ts` (similar to match-service)

**Reference:** Copy structure from `match-service/`

#### 1.2 User Service (services/user-service/)
**Purpose:** Authentication, user management, favorites

**Endpoints:**
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/profile
PUT  /api/profile
GET  /api/favorites/teams
POST /api/favorites/teams/:id
```

**Key Technologies:**
- JWT authentication
- bcrypt for password hashing
- Prisma User model

#### 1.3 API Gateway (services/api-gateway/)
**Purpose:** Central entry point, routing, rate limiting

**Features:**
- Route requests to services
- Rate limiting
- CORS handling
- Request/response logging
- Error handling

**Port:** 3000

### Phase 2: ML Service (Week 2-3)

#### 2.1 ML Service (services/ml-service/)
**Language:** Python 3.11
**Framework:** FastAPI

**Endpoints:**
```python
POST /predict
GET  /predict/:fixture_id
POST /train
GET  /models/performance
```

**Key Files:**
- `main.py` - FastAPI app
- `models/predictor.py` - ML model
- `services/feature_engineering.py`
- `requirements.txt`

**Models:**
- XGBoost (primary)
- LSTM (time series)
- Ensemble method

### Phase 3: Frontend Integration (Week 3-4)

#### 3.1 API Client (apps/web/src/lib/api/)
```typescript
// api/client.ts
// api/matches.ts
// api/predictions.ts
// api/stats.ts
```

#### 3.2 React Query Hooks
```typescript
// hooks/use-matches.ts
// hooks/use-predictions.ts
// hooks/use-stats.ts
```

#### 3.3 Real Data Integration
- Remove mock data
- Connect to backend APIs
- Add loading states
- Error handling

---

## 🔧 DEVELOPMENT WORKFLOW

### Setting Up Development Environment

```bash
# 1. Clone repository
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai

# 2. Install dependencies
pnpm install

# 3. Setup database
cd packages/database
cp ../../.env.example .env
# Edit .env with your Neon PostgreSQL URL
pnpm db:generate
pnpm db:push

# 4. Start services
cd ../..
pnpm dev  # Starts all services
```

### Adding a New Service

```bash
# 1. Create service directory
mkdir -p services/new-service/src

# 2. Copy package.json from match-service
cp services/match-service/package.json services/new-service/

# 3. Update package.json name and dependencies

# 4. Create basic structure
services/new-service/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── middleware/
├── package.json
├── tsconfig.json
└── README.md
```

### Database Changes

```bash
# 1. Edit schema
vim packages/database/prisma/schema.prisma

# 2. Generate migration
cd packages/database
pnpm db:migrate

# 3. Update Prisma client
pnpm db:generate
```

---

## 📝 CODING STANDARDS

### TypeScript

```typescript
// ✅ DO
export interface Match {
  id: number
  homeTeam: Team
  awayTeam: Team
}

// ✅ DO - Use async/await
async function getMatches(): Promise<Match[]> {
  return await prisma.fixture.findMany()
}

// ❌ DON'T - Use any
function process(data: any) {} // Bad

// ✅ DO - Use proper types
function process(data: Match) {} // Good
```

### React Components

```typescript
// ✅ DO - Client components
'use client'
import { useState } from 'react'

export function MatchCard({ match }: { match: Match }) {
  const [isExpanded, setIsExpanded] = useState(false)
  return <div>...</div>
}

// ✅ DO - Server components (default)
export async function MatchList() {
  const matches = await getMatches()
  return <div>...</div>
}
```

### Naming Conventions

```typescript
// Files
match-card.tsx          // React components
match-service.ts        // Services
use-matches.ts          // Hooks
fixture-controller.ts   // Controllers

// Functions
getMatches()           // Get/fetch data
createMatch()          // Create
updateMatch()          // Update
deleteMatch()          // Delete

// Components
<MatchCard />          // PascalCase
<QuickStats />         // PascalCase
```

---

## 🗄️ DATABASE QUICK REFERENCE

### Key Models

```prisma
model Fixture {
  id         Int
  apiId      Int @unique
  matchDate  DateTime
  status     FixtureStatus
  homeTeam   Team
  awayTeam   Team
  league     League
  predictions Prediction[]
}

model Prediction {
  id              Int
  fixture         Fixture
  homeWinProb     Float
  drawProb        Float
  awayWin Prob     Float
  confidence      Float
  explanation     String?
}

model User {
  id              String @id @default(cuid())
  email           String @unique
  passwordHash    String
  favoriteTeams   FavoriteTeam[]
  favoriteLeagues FavoriteLeague[]
}
```

### Common Queries

```typescript
// Get upcoming matches
const matches = await prisma.fixture.findMany({
  where: {
    status: 'SCHEDULED',
    matchDate: { gte: new Date() },
  },
  include: {
    homeTeam: true,
    awayTeam: true,
    league: true,
  },
})

// Get user with favorites
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    favoriteTeams: {
      include: { team: true },
    },
  },
})
```

---

## 🔌 API ENDPOINTS SUMMARY

### Match Service (Port 3001)
```
GET  /api/fixtures/upcoming
GET  /api/fixtures/live
GET  /api/fixtures/:id
POST /api/fixtures/sync
```

### Stats Service (Port 3002) - TODO
```
GET  /api/stats/teams/:id
GET  /api/stats/compare
GET  /api/stats/leagues/:id/standings
```

### User Service (Port 3003) - TODO
```
POST /api/auth/login
GET  /api/profile
POST /api/favorites/teams/:id
```

### ML Service (Port 8000) - TODO
```
POST /predict
GET  /models/performance
```

---

## 🧪 TESTING

```bash
# Run all tests
pnpm test

# Test specific service
pnpm --filter match-service test

# E2E tests
pnpm --filter web test:e2e
```

---

## 🚀 DEPLOYMENT

### Development
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
```

### Environment Variables

See `.env.example` for all required variables:
- DATABASE_URL
- REDIS_URL
- API_FOOTBALL_KEY
- JWT_SECRET
- NEXT_PUBLIC_API_URL

---

## 📚 HELPFUL RESOURCES

### Documentation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- TanStack Query: https://tanstack.com/query
- API-Football: https://www.api-football.com/documentation-v3

### Tools
- Neon Console: https://console.neon.tech
- Upstash Console: https://console.upstash.com
- Vercel Dashboard: https://vercel.com/dashboard

---

## 🐛 COMMON ISSUES

### Prisma Client Not Found
```bash
cd packages/database
pnpm db:generate
```

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9
```

### Redis Connection Failed
- Check REDIS_URL in .env
- Verify Upstash Redis is running

---

## 💡 NEXT TASKS FOR CLAUDE CODE

### Immediate (This Session)
1. ✅ Create Stats Service skeleton
2. ✅ Create User Service skeleton
3. ✅ Setup API Gateway
4. ⏳ Test all services together

### Short Term (Next Session)
1. Implement Stats Service logic
2. Implement User authentication
3. Connect frontend to real APIs
4. Add error boundaries

### Medium Term
1. ML Service (Python)
2. Real-time updates (WebSocket)
3. PWA features
4. Performance optimization

---

## 📞 HELP & SUPPORT

When stuck:
1. Check service README files
2. Look at match-service for reference
3. Review database schema
4. Check similar implementations in codebase

**Important Files to Reference:**
- `packages/database/prisma/schema.prisma` - Database structure
- `services/match-service/` - Complete service example
- `apps/web/src/components/` - Component examples
- `FRONTEND_DESIGN_PRINCIPLES.md` - UI/UX guidelines

---

**Last Updated:** January 23, 2026
**Status:** Phase 1 - Core Setup Complete, Backend Services In Progress
