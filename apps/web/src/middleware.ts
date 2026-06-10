import { NextRequest, NextResponse } from 'next/server'

const APP_DOMAIN = 'app.guix.tech'
const LANDING_DOMAINS = ['guix.tech', 'www.guix.tech']

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

function getAppUrl(path: string) {
  return `https://${APP_DOMAIN}${path}`
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''
  const isLandingDomain = LANDING_DOMAINS.some((d) => hostname === d || hostname.startsWith(`${d}:`))
  const isAppDomain = hostname === APP_DOMAIN || hostname.startsWith(`${APP_DOMAIN}:`)

  // On guix.tech: only serve the landing page, redirect everything else to app.guix.tech
  if (isLandingDomain) {
    if (pathname !== '/') {
      return NextResponse.redirect(getAppUrl(pathname))
    }
    return NextResponse.next()
  }

  // On app.guix.tech (or localhost in dev): redirect root to /login or workspace
  if (isAppDomain || (!isLandingDomain && !isAppDomain)) {
    const token = request.cookies.get('auth_token')?.value
    const isAuthenticated = token && !isTokenExpired(token)

    // Root on app domain → redirect authenticated users to their workspace, others to /login
    if (pathname === '/') {
      if (isAuthenticated) {
        const orgSlug = request.cookies.get('auth_org_slug')?.value
        if (orgSlug) {
          return NextResponse.redirect(new URL(`/${orgSlug}`, request.url))
        }
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

    // Unauthenticated user hitting protected route → redirect to /login
    if (!isAuthenticated && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Authenticated user hitting auth entry pages → redirect to workspace
    if (isAuthenticated && AUTH_ENTRY_PATHS.some((p) => pathname.startsWith(p))) {
      const orgSlug = request.cookies.get('auth_org_slug')?.value
      if (orgSlug) {
        return NextResponse.redirect(new URL(`/${orgSlug}`, request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
