import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/favorites', '/admin', '/profile']
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/two-factor']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  // Protected routes — redirect to login if no token
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth routes — redirect to home if already logged in
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin route — check admin role
  if (pathname.startsWith('/admin')) {
    const isAdmin = request.cookies.get('user-role')?.value === 'admin'
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/favorites/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/two-factor',
  ],
}
