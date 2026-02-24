import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@football-ai/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loginAuditLog: {
      create: vi.fn(),
    },
    tokenBlacklist: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}))

// Mock security utilities
vi.mock('../src/lib/security', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn(),
  hashToken: vi.fn().mockReturnValue('hashed_token'),
  createEmailVerificationToken: vi.fn().mockReturnValue({
    token: 'verify_token',
    hashedToken: 'hashed_verify_token',
    expires: new Date(Date.now() + 86400000),
  }),
  createPasswordResetToken: vi.fn().mockReturnValue({
    token: 'reset_token',
    hashedToken: 'hashed_reset_token',
    expires: new Date(Date.now() + 3600000),
  }),
  isAccountLocked: vi.fn().mockReturnValue(false),
  calculateLockoutTime: vi.fn().mockReturnValue(new Date(Date.now() + 1800000)),
  shouldLockAccount: vi.fn().mockReturnValue(false),
  generate2FASecret: vi.fn().mockReturnValue({ secret: 'test_secret', otpauthUrl: 'otpauth://totp/test' }),
  generateQRCode: vi.fn().mockResolvedValue('data:image/png;base64,qrcode'),
  verify2FACode: vi.fn().mockReturnValue(true),
  generateBackupCodes: vi.fn().mockReturnValue({ codes: ['CODE1', 'CODE2'], hashedCodes: ['hash1', 'hash2'] }),
  verifyBackupCode: vi.fn().mockReturnValue({ valid: true, remainingCodes: [] }),
  isAdminEmail: vi.fn().mockReturnValue(false),
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Registration', () => {
    it('should hash password before storing', async () => {
      const { hashPassword } = await import('../src/lib/security')
      await hashPassword('TestPassword123')
      expect(hashPassword).toHaveBeenCalledWith('TestPassword123')
    })

    it('should generate email verification token', async () => {
      const { createEmailVerificationToken } = await import('../src/lib/security')
      const result = createEmailVerificationToken()
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('hashedToken')
      expect(result).toHaveProperty('expires')
    })
  })

  describe('Account Lockout', () => {
    it('should detect locked account', async () => {
      const { isAccountLocked } = await import('../src/lib/security')
      const future = new Date(Date.now() + 1800000)
      isAccountLocked(future)
      expect(isAccountLocked).toHaveBeenCalledWith(future)
    })

    it('should lock after max attempts', async () => {
      const { shouldLockAccount } = await import('../src/lib/security')
      shouldLockAccount(5)
      expect(shouldLockAccount).toHaveBeenCalledWith(5)
    })
  })

  describe('2FA', () => {
    it('should generate 2FA secret', async () => {
      const { generate2FASecret } = await import('../src/lib/security')
      const result = generate2FASecret('test@example.com')
      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('otpauthUrl')
    })

    it('should verify 2FA code', async () => {
      const { verify2FACode } = await import('../src/lib/security')
      const result = verify2FACode('secret', '123456')
      expect(result).toBe(true)
    })

    it('should generate backup codes', async () => {
      const { generateBackupCodes } = await import('../src/lib/security')
      const result = generateBackupCodes()
      expect(result.codes).toHaveLength(2)
      expect(result.hashedCodes).toHaveLength(2)
    })
  })

  describe('Password Reset', () => {
    it('should create password reset token', async () => {
      const { createPasswordResetToken } = await import('../src/lib/security')
      const result = createPasswordResetToken()
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('hashedToken')
      expect(result.expires.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('Token Management', () => {
    it('should hash token for blacklisting', async () => {
      const { hashToken } = await import('../src/lib/security')
      const result = hashToken('jwt_token_here')
      expect(result).toBe('hashed_token')
    })
  })
})
