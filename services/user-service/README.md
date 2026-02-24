# User Service

Authentication, user profile management, and favorites service. Handles JWT auth, user registration/login, and favorite teams/leagues.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT, bcryptjs
- **Validation:** Zod
- **Port:** 3003

## Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/auth/me` | Bearer | Get current user |

### Profile & Favorites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | Bearer | Get profile |
| PUT | `/api/profile` | Bearer | Update profile |
| GET | `/api/profile/favorites/teams` | Bearer | Get favorite teams |
| POST | `/api/profile/favorites/teams/:id` | Bearer | Add favorite team |
| DELETE | `/api/profile/favorites/teams/:id` | Bearer | Remove favorite team |
| GET | `/api/profile/favorites/leagues` | Bearer | Get favorite leagues |
| POST | `/api/profile/favorites/leagues/:id` | Bearer | Add favorite league |
| DELETE | `/api/profile/favorites/leagues/:id` | Bearer | Remove favorite league |
| GET | `/health` | Public | Health check |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | No | Refresh token secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `PORT` | No | Server port (default: 3003) |

## Setup

```bash
pnpm install
pnpm --filter user-service dev
```

## Status

- [x] User registration & login
- [x] JWT authentication middleware
- [x] Profile management
- [x] Favorite teams CRUD
- [x] Favorite leagues CRUD
- [x] Health check
- [ ] Password reset flow
- [ ] Email verification
- [ ] 2FA (TOTP)
- [ ] Google OAuth
- [ ] Token refresh
