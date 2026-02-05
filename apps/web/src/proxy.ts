import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/admin', '/settings', '/profile']

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login', '/register']

// Public routes that don't require any checks
const PUBLIC_AUTH_ROUTES = ['/forgot-password', '/reset-password', '/two-factor', '/verify-email']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session cookie (non-httpOnly, can be checked in middleware)
  const sessionCookie = request.cookies.get('auth-session')
  const isAuthenticated = sessionCookie?.value === 'true'

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Protected routes - redirect to login if not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Auth routes - redirect to home if already authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Public auth routes - allow access regardless of auth status
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
