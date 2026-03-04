import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/favorites', '/admin', '/profile']

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login', '/register']

// Public auth routes that don't require any checks
const PUBLIC_AUTH_ROUTES = [
  '/forgot-password',
  '/reset-password',
  '/two-factor',
  '/verify-email',
]

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth token (httpOnly cookie set by login/register)
  const token = request.cookies.get('auth-token')?.value
  // Fallback: also check session cookie for backwards compat
  const sessionCookie = request.cookies.get('auth-session')
  const isAuthenticated = !!token || sessionCookie?.value === 'true'

  // Check route types
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Protected routes — redirect to login if not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin route — check admin role (cookie)
  if (pathname.startsWith('/admin') && isAuthenticated) {
    const isAdmin = request.cookies.get('user-role')?.value === 'admin'
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Auth routes — redirect to home if already authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Public auth routes — allow access regardless of auth status
  if (isPublicAuthRoute) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|site\\.webmanifest|sw\\.js|icons|screenshots|og-image|.*\\.(?:png|svg|ico|jpg|webp|webmanifest|js|css|json)$).*)',
  ],
}
