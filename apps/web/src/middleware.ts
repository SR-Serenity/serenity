import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/invite/']
const AUTH_ENTRY_PATHS = ['/login', '/register']

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) {
      return false
    }
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  const isAuthenticated = token && !isTokenExpired(token)

  // Unauthenticated user hitting protected route → redirect to /login
  if (!isAuthenticated && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting auth entry pages → redirect to workspace.
  // Invite links must remain reachable so existing users can join another org.
  if (isAuthenticated && AUTH_ENTRY_PATHS.some((p) => pathname.startsWith(p))) {
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
