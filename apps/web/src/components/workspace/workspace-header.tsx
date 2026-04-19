import { Bell, Search } from 'lucide-react'

interface WorkspaceHeaderProps {
  title: string
  subtitle?: string
  userDisplayName?: string
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function WorkspaceHeader({ title, subtitle, userDisplayName }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 md:px-8 py-4 bg-white">
      <div>
        <h1 className="text-xl font-semibold text-brand tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand hover:bg-brand-light/60 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand hover:bg-brand-light/60 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
        </button>

        {userDisplayName && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center text-xs font-bold ml-1 cursor-pointer">
            {getInitials(userDisplayName)}
          </div>
        )}
      </div>
    </div>
  )
}
