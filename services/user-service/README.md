# User Service

Comprehensive authentication, user profile management, and favorites service. Features JWT auth, 2FA (TOTP), Google OAuth, email verification, password reset, account lockout, and login audit trail.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT, bcryptjs, speakeasy (TOTP), qrcode
- **Validation:** Zod
- **Port:** 3003

## Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login (with account lockout) |
| POST | `/api/auth/logout` | Bearer | Logout (token blacklisting) |
| GET | `/api/auth/me` | Bearer | Get current user |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/verify-email` | Public | Verify email address |
| GET | `/api/auth/google` | Public | Google OAuth redirect |
| GET | `/api/auth/google/callback` | Public | Google OAuth callback |
| POST | `/api/auth/2fa/setup` | Bearer | Generate 2FA secret + QR code |
| POST | `/api/auth/2fa/enable` | Bearer | Enable 2FA with verification code |
| POST | `/api/auth/2fa/disable` | Bearer | Disable 2FA (requires password) |
| POST | `/api/auth/2fa/verify` | Public | Verify 2FA code during login |

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

## Security Features

- **Account Lockout:** 5 failed attempts → 30 min lock
- **Token Blacklisting:** Invalidate tokens on logout/password reset
- **Rate Limiting:** Register (5/hour), Login (10/min), Password reset (3/hour)
- **Login Audit:** All auth events logged with IP and user agent
- **2FA:** TOTP with 10 backup codes

## Status

- [x] User registration & login
- [x] JWT authentication middleware
- [x] Profile management
- [x] Favorite teams/leagues CRUD
- [x] Password reset flow
- [x] Email verification
- [x] 2FA (TOTP) with backup codes
- [x] Google OAuth
- [x] Account lockout protection
- [x] Token blacklisting
- [x] Login audit trail
- [x] Rate limiting
- [ ] Token refresh (refresh token endpoint)
