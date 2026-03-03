# User Service

Authentication, user profile management, and favorites service. Features JWT auth, 2FA (TOTP), Google OAuth, email verification, password reset, account lockout, and login audit trail.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js 4
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (Prisma ORM via `@football-ai/database`)
- **Auth:** JWT (jsonwebtoken), bcryptjs
- **2FA:** speakeasy (TOTP), qrcode
- **Cache:** Redis (Upstash, ioredis) for token blacklisting
- **Validation:** Zod
- **Security:** Helmet, CORS
- **Port:** 3003

## API Endpoints

### Authentication (Public)

| Method | Path                        | Description                  |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/api/auth/register`        | Register new user            |
| POST   | `/api/auth/login`           | Login (with account lockout) |
| POST   | `/api/auth/forgot-password` | Request password reset       |
| POST   | `/api/auth/reset-password`  | Reset password with token    |
| POST   | `/api/auth/verify-email`    | Verify email address         |
| POST   | `/api/auth/2fa/verify`      | Verify 2FA code during login |
| GET    | `/api/auth/google`          | Google OAuth redirect        |
| GET    | `/api/auth/google/callback` | Google OAuth callback        |

```json
// POST /api/auth/register
// Request:
{ "email": "user@example.com", "password": "SecurePass123!", "name": "John Doe" }

// Response:
{ "success": true, "data": { "user": { "id": 1, "email": "user@example.com", "name": "John Doe" }, "token": "eyJ..." } }

// POST /api/auth/login
// Request:
{ "email": "user@example.com", "password": "SecurePass123!" }

// Response:
{ "success": true, "data": { "token": "eyJ...", "user": { "id": 1, "email": "user@example.com" } } }

// If 2FA enabled:
{ "success": true, "requires2FA": true, "tempToken": "temp_..." }
```

### Authentication (Protected - Bearer Token)

| Method | Path                    | Description                       |
| ------ | ----------------------- | --------------------------------- |
| POST   | `/api/auth/logout`      | Logout (token blacklisting)       |
| GET    | `/api/auth/me`          | Get current user                  |
| POST   | `/api/auth/2fa/setup`   | Generate 2FA secret + QR code     |
| POST   | `/api/auth/2fa/enable`  | Enable 2FA with verification code |
| POST   | `/api/auth/2fa/disable` | Disable 2FA (requires password)   |

### Profile & Favorites (Protected - Bearer Token)

| Method | Path                                 | Description            |
| ------ | ------------------------------------ | ---------------------- |
| GET    | `/api/profile`                       | Get user profile       |
| PUT    | `/api/profile`                       | Update user profile    |
| GET    | `/api/profile/favorites/teams`       | Get favorite teams     |
| POST   | `/api/profile/favorites/teams/:id`   | Add favorite team      |
| DELETE | `/api/profile/favorites/teams/:id`   | Remove favorite team   |
| GET    | `/api/profile/favorites/leagues`     | Get favorite leagues   |
| POST   | `/api/profile/favorites/leagues/:id` | Add favorite league    |
| DELETE | `/api/profile/favorites/leagues/:id` | Remove favorite league |

```json
// GET /api/profile/favorites/teams
{
  "success": true,
  "data": [{ "id": 1, "teamId": 57, "name": "Arsenal", "logoUrl": "..." }]
}
```

### Health

| Method | Path      | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

```json
{
  "status": "ok",
  "service": "user-service",
  "version": "1.0.0",
  "uptime": 3600
}
```

## Security Features

| Feature            | Details                                        |
| ------------------ | ---------------------------------------------- |
| Account lockout    | 5 failed attempts -> 30 min lock               |
| Token blacklisting | Invalidate tokens on logout/password reset     |
| Rate limiting      | Register: 5/hour, Login: 10/min, Reset: 3/hour |
| Login audit        | All auth events logged with IP and user agent  |
| 2FA                | TOTP with 10 backup codes                      |
| JWT validation     | Min 32 char secret, configurable expiry        |

## Environment Variables

| Variable               | Required | Default               | Description                         |
| ---------------------- | -------- | --------------------- | ----------------------------------- |
| `PORT`                 | No       | 3003                  | Server port                         |
| `NODE_ENV`             | No       | development           | Environment                         |
| `DATABASE_URL`         | **Yes**  | -                     | PostgreSQL connection string (Neon) |
| `REDIS_URL`            | No       | -                     | Redis for token blacklisting        |
| `JWT_SECRET`           | **Yes**  | -                     | JWT secret key (min 32 chars)       |
| `JWT_REFRESH_SECRET`   | No       | JWT_SECRET            | Refresh token secret                |
| `JWT_EXPIRES_IN`       | No       | 7d                    | JWT expiration                      |
| `GOOGLE_CLIENT_ID`     | No       | -                     | Google OAuth client ID              |
| `GOOGLE_CLIENT_SECRET` | No       | -                     | Google OAuth client secret          |
| `NEXT_PUBLIC_APP_URL`  | No       | http://localhost:3100 | Frontend app URL                    |

## Project Structure

```
services/user-service/
├── src/
│   ├── config/
│   │   └── index.ts                # Environment config & validation
│   ├── controllers/
│   │   ├── auth.controller.ts      # Auth handlers (login, register, 2FA, OAuth)
│   │   └── profile.controller.ts   # Profile & favorites handlers
│   ├── lib/
│   │   └── security.ts             # Password hashing, token utils
│   ├── middleware/
│   │   ├── async-handler.ts        # Async error wrapper
│   │   ├── auth.middleware.ts       # JWT authentication
│   │   ├── error-handler.ts        # Global error handler
│   │   └── request-logger.ts       # Request logging
│   ├── routes/
│   │   ├── auth.routes.ts          # /api/auth routes
│   │   └── profile.routes.ts       # /api/profile routes
│   ├── services/
│   │   ├── auth.service.ts         # Auth business logic
│   │   └── user.service.ts         # User CRUD operations
│   ├── types/
│   │   └── auth.types.ts           # Auth type definitions
│   └── index.ts                    # Express app entry point
├── package.json
├── tsconfig.json
└── railway.json
```

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server with hot reload
pnpm --filter user-service dev

# Type check
pnpm --filter user-service typecheck

# Build
pnpm --filter user-service build

# Run tests
pnpm --filter user-service test
```

## Deployment

- **Platform:** Railway (Nixpacks)
- **Build:** `tsc`
- **Start:** `node dist/index.js`
- **Config:** `railway.json` in service root
- **Health check:** `GET /health`

## Dependencies (Other Services)

| Service                   | Relationship      | Description                                |
| ------------------------- | ----------------- | ------------------------------------------ |
| **@football-ai/database** | Workspace package | Prisma ORM client, shared schema           |
| **api-gateway**           | Upstream proxy    | Receives proxied requests from gateway     |
| **match-service**         | Shared JWT        | Uses same JWT_SECRET for auth verification |
| **Google OAuth**          | External          | Google sign-in provider                    |
