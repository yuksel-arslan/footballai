# FootballAI — Sprint 6 Claude Code Direktifi

Tarih: 3 Mart 2026
Repo: github.com/yuksel-arslan/footballai.git (main branch)
Monorepo: pnpm + Turborepo | Deploy: Vercel (web) + Railway/Railpack (services) + Neon (DB) + Upstash (Redis)

Sprint 1-5 tamamlandi. Bu sprint frontend feature completion + veri akisi.

---

## GOREV 1 — Match Detail Page (ONCELIK: KRITIK)

Match detail sayfasi yok. Kullanici mac kartina tikladiginda detay sayfasina gitmeli.

### 1.1 Sayfa olustur

Dosya: apps/web/src/app/matches/[id]/page.tsx

Icerik:

- Mac bilgisi (homeTeam vs awayTeam, tarih, lig, stadyum)
- Skor (canli ise live badge + dakika)
- AI Prediction bolumu (Gemini — auth gerekli, yoksa login yonlendir)
- ML Prediction bolumu (Poisson + XGBoost — public)
- H2H istatistikleri
- Son 5 mac formu (her iki takim)
- Lig siralamasi karsilastirmasi

Data flow:

- GET /api/fixtures/:id -> match-service (mac detay)
- GET /api/stats/h2h/:team1/:team2 -> stats-service
- GET /api/stats/teams/:id/form -> stats-service (her iki takim)
- POST /api/predictions/ml -> match-service -> ml-service (ML prediction)
- GET /api/predictions/:fixtureId -> match-service (AI prediction, auth)

### 1.2 Frontend API proxy route

Dosya: apps/web/src/app/api/fixtures/[id]/route.ts
GET proxy -> gateway -> match-service

Dosya: apps/web/src/app/api/stats/h2h/[team1]/[team2]/route.ts
GET proxy -> gateway -> stats-service

Dosya: apps/web/src/app/api/stats/teams/[id]/form/route.ts
GET proxy -> gateway -> stats-service

### 1.3 React Query hook

Dosya: apps/web/src/hooks/use-match-detail.ts

- useMatchDetail(fixtureId) — mac bilgisi
- useH2H(team1Id, team2Id) — H2H
- useTeamForm(teamId) — son 5 mac

### 1.4 MatchCard'a link ekle

apps/web/src/components/matches/match-card.tsx
Mac kartina tiklaninca /matches/[id] sayfasina yonlendir (Next.js Link veya router.push)

### 1.5 Loading + Error

apps/web/src/app/matches/[id]/loading.tsx
apps/web/src/app/matches/[id]/error.tsx

Commit: feat: match detail page with predictions, H2H, and team form

---

## GOREV 2 — Team Detail Page (ONCELIK: YUKSEK)

### 2.1 Sayfa olustur

Dosya: apps/web/src/app/teams/[id]/page.tsx

Icerik:

- Takim bilgisi (isim, logo, lig)
- Istatistikler (mac, galibiyet, maglubiyet, gol, puan)
- Son maclar listesi (son 10)
- Form grafigi (son 5 mac visual — W/D/L renkli)

Data flow:

- GET /api/teams/:id -> match-service
- GET /api/teams/:id/fixtures -> match-service
- GET /api/stats/teams/:id -> stats-service
- GET /api/stats/teams/:id/form -> stats-service

### 2.2 Frontend API proxy

Dosya: apps/web/src/app/api/teams/[id]/route.ts
Dosya: apps/web/src/app/api/teams/[id]/fixtures/route.ts
Dosya: apps/web/src/app/api/stats/teams/[id]/route.ts

### 2.3 Hook

Dosya: apps/web/src/hooks/use-team-detail.ts

### 2.4 Loading + Error

apps/web/src/app/teams/[id]/loading.tsx
apps/web/src/app/teams/[id]/error.tsx

Commit: feat: team detail page with stats and recent matches

---

## GOREV 3 — Duplicate Hook Temizligi (ONCELIK: ORTA)

2 prediction hook var:

- apps/web/src/hooks/use-prediction.ts (97 satir — yeni, React Query)
- apps/web/src/hooks/usePrediction.ts (63 satir — eski)

### 3.1 Analiz et

usePrediction.ts kullanan tum dosyalari bul:

```bash
grep -r "usePrediction\|from.*usePrediction" apps/web/src --include="*.tsx" --include="*.ts"
```

### 3.2 Tek hook'a birlesik et

use-prediction.ts'i master yap. usePrediction.ts'ten gereken logic'i tasi.
Tum import'lari use-prediction.ts'e yonlendir.
usePrediction.ts dosyasini sil.

### 3.3 Naming convention

Tum hook'lar kebab-case olmali (use-\*.ts). useAuth.ts -> use-auth.ts olarak rename et.
Import'lari guncelle.

Commit: refactor: consolidate prediction hooks, standardize naming

---

## GOREV 4 — Standings Model + Gercek Data (ONCELIK: YUKSEK)

Prisma schema'da Standing modeli yok. Standings sayfasi veri gosteremiyor.

### 4.1 Prisma Standing modeli ekle

Dosya: packages/database/prisma/schema.prisma

```prisma
model Standing {
  id          Int      @id @default(autoincrement())
  leagueId    Int
  league      League   @relation(fields: [leagueId], references: [id])
  teamId      Int
  team        Team     @relation(fields: [teamId], references: [id])
  season      Int
  position    Int
  played      Int      @default(0)
  won         Int      @default(0)
  drawn       Int      @default(0)
  lost        Int      @default(0)
  goalsFor    Int      @default(0)
  goalsAgainst Int     @default(0)
  goalDifference Int   @default(0)
  points      Int      @default(0)
  form        String?  @db.VarChar(10)
  updatedAt   DateTime @updatedAt

  @@unique([leagueId, teamId, season])
  @@index([leagueId, season])
}
```

League ve Team modellerine relation ekle:

```prisma
model League {
  // mevcut alanlar...
  standings Standing[]
}

model Team {
  // mevcut alanlar...
  standings Standing[]
}
```

### 4.2 Migration

```bash
pnpm db:generate
pnpm db:push  (veya pnpm db:migrate -- --name add-standing-model)
```

### 4.3 Stats-service standings endpoint guncelle

services/stats-service/src altinda standings route'u Standing modelini kullansin.

### 4.4 Standings sync

match-service'te fixture sync sirasinda standings da guncellensin.
Football-Data.org API: GET /v4/competitions/{code}/standings

Commit: feat: Standing model + real standings data

---

## GOREV 5 — Fixture Sync Cron (ONCELIK: ORTA)

### 5.1 node-cron ekle

```bash
pnpm add node-cron --filter match-service
pnpm add -D @types/node-cron --filter match-service
```

### 5.2 Cron service olustur

Dosya: services/match-service/src/services/cron.ts

```typescript
import cron from 'node-cron'
import { logger } from '../lib/logger'
import { fixtureService } from './fixture-service'

export function startCronJobs() {
  // Her 6 saatte bir fixture sync
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron: fixture sync basladi')
    try {
      await fixtureService.syncFromProviders()
      logger.info('Cron: fixture sync tamamlandi')
    } catch (error) {
      logger.error({ error }, 'Cron: fixture sync hatasi')
    }
  })

  // Her gun gece 3'te standings sync
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron: standings sync basladi')
    try {
      await fixtureService.syncStandings()
      logger.info('Cron: standings sync tamamlandi')
    } catch (error) {
      logger.error({ error }, 'Cron: standings sync hatasi')
    }
  })

  logger.info('Cron jobs baslatildi')
}
```

### 5.3 Index'te baslat

services/match-service/src/index.ts'de server.listen sonrasi:

```typescript
import { startCronJobs } from './services/cron'
startCronJobs()
```

Commit: feat: cron jobs for fixture and standings sync

---

## CALISMA SIRASI

1. Gorev 1 — Match Detail Page (en kritik eksik ozellik)
2. Gorev 2 — Team Detail Page
3. Gorev 3 — Hook temizligi
4. Gorev 4 — Standing model + gercek data
5. Gorev 5 — Cron sync

Her gorev sonrasi commit + push.
Conventional commits: fix:, feat:, refactor:, chore:

## TASARIM NOTLARI

- Dark/light mode destegi (tum yeni sayfalar)
- Glassmorphism + neon glow UI theme (mevcut tarz)
- Responsive: mobile-first (xs:400, sm:640, md:768, lg:1024)
- Tailwind CSS — HSL CSS variables (--background, --foreground, --card, --primary, --secondary, --accent)
- Renk paleti: #2563EB (primary blue), #0EA5E9 (secondary cyan), #FBBF24 (accent gold), #EF4444 (destructive red)
- Font: Geist Sans + Geist Mono
- i18n: useI18n() hook ile ceviri (en/tr minimum)
- Loading: Skeleton component kullan
- Error: error.tsx boundary (mevcut pattern'i takip et)

## TEKNIK NOTLAR

- Next.js 15 (App Router) — params Promise: const { id } = await params
- Express req.query: String() ile cast
- tsconfig strict:true, noUnusedLocals, noUnusedParameters
- Unused params: \_ prefix
- socket.io-client: dynamic import only
- Pino logger kullan (console.log degil)
- Railway builder: RAILPACK
