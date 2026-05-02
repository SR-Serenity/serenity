'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

interface WorkspaceSidebarProps {
  basePath: string
  currentPath: string
  navItems: NavItem[]
  orgName: string
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function WorkspaceSidebar({
  basePath,
  currentPath,
  navItems,
  orgName,
}: WorkspaceSidebarProps) {
  function resolveHref(href: string) {
    return `${basePath}/${href}`
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-sidebar-foreground py-6">
      {/* Workspace Identity Section */}
      <div className="flex flex-col items-center mb-6 mt-4 px-2 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-sidebar-border shadow-inner group cursor-default transition-all duration-300 hover:bg-white/15">
          <span className="text-sm font-bold tracking-wider text-white/90">
            {getInitials(orgName)}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 flex flex-col items-center gap-1 overflow-y-auto no-scrollbar px-1">
        {navItems.map((item) => {
          const target = resolveHref(item.href)
          const isActive =
            currentPath === target ||
            (item.href === 'dashboard' &&
              (currentPath === basePath || currentPath === `${basePath}/`))

          return (
            <Link
              key={item.label}
              href={target}
              title={item.label}
              className={cn(
                'group relative flex flex-col items-center justify-center transition-all duration-300 w-full py-2.5 gap-1.5 text-white',
                isActive ? 'bg-white/5' : 'hover:bg-white/2'
              )}
            >
              {/* Active Left Border Accent */}
              {isActive && (
                <div className="absolute left-0 top-0 w-0.5 h-full bg-primary shadow-[0_0_10px_rgba(21,112,239,0.5)]" />
              )}
              
              <item.icon className={cn(
                "w-4.5 h-4.5 transition-all duration-300", 
                isActive ? "text-primary scale-105" : "text-white/40 group-hover:text-white"
              )} />
              
              <span className={cn(
                'font-medium transition-all duration-300 text-[9px] uppercase tracking-wider w-full text-center px-0.5 whitespace-nowrap overflow-visible',
                isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
