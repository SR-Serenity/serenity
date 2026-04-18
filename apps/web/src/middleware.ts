import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  const isAuthenticated = Boolean(token)

  // Unauthenticated user hitting protected route → redirect to /login
  if (!isAuthenticated && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting /login or /register → redirect to workspace
  if (isAuthenticated && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const orgSlug = request.cookies.get('auth_org_slug')?.value
    if (orgSlug) {
      return NextResponse.redirect(new URL(`/${orgSlug}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
