/**
 * Normalize an auth backend response into a single Turkish error message.
 *
 * The user-service replies in several shapes ({ error }, { errors: ZodIssue[] },
 * { message }) and mostly in English; the UI must always get one readable
 * Turkish sentence — "Kayıt başarısız" with no reason is not acceptable.
 */
const TRANSLATIONS: [RegExp, string][] = [
  [/already registered/i, 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.'],
  [/invalid email or password/i, 'E-posta veya şifre hatalı.'],
  [/account is locked|locked/i, 'Hesap çok sayıda başarısız deneme nedeniyle geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.'],
  [/too many registration attempts/i, 'Çok fazla kayıt denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.'],
  [/too many (login|auth) attempts/i, 'Çok fazla deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.'],
  [/too many requests/i, 'Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.'],
  [/valid email required|invalid email/i, 'Geçerli bir e-posta adresi girin.'],
  [/password must be at least 8/i, 'Şifre en az 8 karakter olmalı.'],
  [/name must be at least/i, 'İsim en az 2 karakter olmalı.'],
  [/invalid or expired/i, 'Bağlantı geçersiz ya da süresi dolmuş.'],
  [/internal server error/i, 'Sunucu hatası oluştu. Lütfen tekrar deneyin.'],
  [/email is required/i, 'E-posta gerekli.'],
  [/required/i, 'Zorunlu alanlar eksik.'],
]

export function toTurkishAuthError(
  data: unknown,
  fallback = 'İşlem başarısız oldu. Lütfen tekrar deneyin.'
): string {
  const d = (data ?? {}) as {
    error?: unknown
    message?: unknown
    errors?: { message?: unknown }[]
  }
  const raw =
    (typeof d.error === 'string' && d.error) ||
    (Array.isArray(d.errors) &&
      typeof d.errors[0]?.message === 'string' &&
      d.errors[0].message) ||
    (typeof d.message === 'string' && d.message) ||
    ''
  if (!raw) return fallback
  for (const [re, tr] of TRANSLATIONS) {
    if (re.test(raw)) return tr
  }
  // Unknown message: pass it through (it may already be Turkish from newer
  // backends) so the cause is never hidden.
  return raw
}
