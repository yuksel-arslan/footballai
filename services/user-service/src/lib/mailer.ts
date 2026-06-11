import { logger } from './logger'

/**
 * Outbound email via the Resend HTTP API (plain fetch — no SDK dependency).
 * Configured with RESEND_API_KEY (+ optional MAIL_FROM, APP_BASE_URL).
 *
 * IMPORTANT: when the mailer is NOT configured, auth flows must never depend
 * on an email arriving — callers auto-verify instead of leaving the user
 * stuck waiting for a mail that can't be sent.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const MAIL_FROM = process.env.MAIL_FROM || 'FootballAI <onboarding@resend.dev>'
const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://footballai.io'
).replace(/\/$/, '')

export const isMailerConfigured = (): boolean => !!RESEND_API_KEY

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      logger.error({ status: res.status, detail, to, subject }, 'mail send failed')
      return false
    }
    return true
  } catch (error) {
    logger.error({ error, to, subject }, 'mail send threw')
    return false
  }
}

const wrap = (title: string, body: string, cta: { label: string; url: string }) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#0f172a;margin:0 0 12px">${title}</h2>
  <p style="color:#475569;font-size:14px;line-height:1.6">${body}</p>
  <a href="${cta.url}"
     style="display:inline-block;margin:16px 0;padding:12px 22px;border-radius:10px;
            background:linear-gradient(135deg,#10B981,#059669);color:#fff;
            text-decoration:none;font-weight:600;font-size:14px">${cta.label}</a>
  <p style="color:#94a3b8;font-size:12px;line-height:1.6">
    Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>
    <span style="word-break:break-all">${cta.url}</span>
  </p>
  <p style="color:#94a3b8;font-size:12px">Bu e-postayı siz talep etmediyseniz yok sayabilirsiniz.</p>
</div>`

/** Verification email; returns false when not configured / failed. */
export async function sendVerificationEmail(
  to: string,
  rawToken: string
): Promise<boolean> {
  const url = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(rawToken)}`
  return send(
    to,
    'FootballAI — E-posta adresinizi doğrulayın',
    wrap(
      'E-posta adresinizi doğrulayın',
      'FootballAI hesabınız oluşturuldu. Hesabınızı doğrulamak için aşağıdaki butona tıklayın. Bağlantı 24 saat geçerlidir.',
      { label: 'E-postamı doğrula', url }
    )
  )
}

/** Password-reset email; returns false when not configured / failed. */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string
): Promise<boolean> {
  const url = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`
  return send(
    to,
    'FootballAI — Şifre sıfırlama',
    wrap(
      'Şifrenizi sıfırlayın',
      'Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bağlantı 1 saat geçerlidir.',
      { label: 'Şifremi sıfırla', url }
    )
  )
}
