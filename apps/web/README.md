# FootballAI Web App

Next.js 15 frontend application for FootballAI.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **UI Components:** Custom (shadcn/ui inspired)
- **Fonts:** Geist Sans & Mono
- **Icons:** Lucide React

## Development

```bash
# Install dependencies (from root)
cd ../.. && pnpm install

# Run dev server
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # React Query, Theme providers
├── components/
│   ├── layout/            # Header, Footer, etc.
│   ├── matches/           # Match cards, lists
│   ├── home/              # Home page components
│   └── ui/                # Reusable UI components
├── lib/
│   ├── utils.ts           # Utility functions
│   └── api/               # API client (coming soon)
└── types/
    └── index.ts           # TypeScript types

```

## Features

- ✅ Server Components (default)
- ✅ Client Components (marked with 'use client')
- ✅ Dark mode (default)
- ✅ Responsive design
- ✅ TypeScript strict mode
- ✅ TanStack Query for data fetching
- 🚧 PWA support (coming soon)
- 🚧 Real-time updates (WebSocket)

## Environment Variables

See `.env.example` in root directory.

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Notes

- Components use `cn()` utility for className merging
- All colors are CSS variables (supports theme switching)
- Mock data used until backend is ready
