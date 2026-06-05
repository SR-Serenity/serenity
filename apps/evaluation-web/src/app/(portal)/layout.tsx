'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore, isExpired } from '@/lib/auth-store'
import { LayoutDashboard, Database, PlayCircle, LogOut } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/runs', label: 'Runs', icon: PlayCircle },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const hydrated = useAuthStore((s) => s.hydrated)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Wait until localStorage is hydrated before checking auth
    if (!hydrated) return
    if (!session || isExpired(session.token)) {
      logout()
      router.replace('/login')
    }
  }, [hydrated, session, logout, router])

  // Show nothing until hydration is complete to avoid flash-redirect
  if (!hydrated) return null
  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-brand text-white">
        <div className="px-4 py-5 border-b border-white/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Evaluation</p>
          <p className="text-sm font-medium mt-0.5 truncate">{session.org.name}</p>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-white/50 truncate">{session.user.email}</p>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="mt-2 flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
