import { ADS_ENABLED, ADSENSE_CLIENT } from '@/lib/ads'

/**
 * Dynamic /ads.txt — AdSense authorized-sellers file. Auto-fills from the
 * publisher ID env var (ca-pub-XXXX → pub-XXXX). Returns empty until ads are
 * configured, so we don't publish a bogus record.
 */
export function GET() {
  if (!ADS_ENABLED) {
    return new Response('', { status: 204 })
  }
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '') // ca-pub-123 -> pub-123
  const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  })
}
