import type { ComponentType } from 'react'
import {
  Bell,
  Calendar,
  LayoutDashboard,
  ListTodo,
  Mail,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  SquareKanban,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageConfig {
  icon: ComponentType<{ className?: string }>
  subtitle: string
  actionLabel?: string
  iconColor: string
  iconBg: string
}

const pageConfig: Record<string, PageConfig> = {
  Inbox: {
    icon: MessageSquareText,
    subtitle: 'Messages and conversations from your team.',
    actionLabel: 'New Message',
    iconColor: 'text-info',
    iconBg: 'bg-info-light',
  },
  Search: {
    icon: Search,
    subtitle: 'Find anything across your workspace instantly.',
    iconColor: 'text-brand-muted',
    iconBg: 'bg-muted',
  },
  Calendar: {
    icon: Calendar,
    subtitle: 'Your schedule, meetings and deadlines.',
    actionLabel: 'New Event',
    iconColor: 'text-success',
    iconBg: 'bg-success-light',
  },
  Notifications: {
    icon: Bell,
    subtitle: 'Alerts and updates from across your workspace.',
    iconColor: 'text-warning',
    iconBg: 'bg-warning-light',
  },
  Mail: {
    icon: Mail,
    subtitle: 'Send and receive emails within your organization.',
    actionLabel: 'Compose',
    iconColor: 'text-info',
    iconBg: 'bg-info-light',
  },
  Workspace: {
    icon: SquareKanban,
    subtitle: 'Boards, projects and collaborative workspaces.',
    actionLabel: 'New Board',
    iconColor: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  Tasks: {
    icon: ListTodo,
    subtitle: 'Create, assign and track tasks across your team.',
    actionLabel: 'New Task',
    iconColor: 'text-warning',
    iconBg: 'bg-warning-light',
  },
  Profile: {
    icon: UserRound,
    subtitle: 'Manage your personal information and preferences.',
    actionLabel: 'Edit Profile',
    iconColor: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  Settings: {
    icon: Settings,
    subtitle: 'Configure your workspace, members and integrations.',
    iconColor: 'text-brand-muted',
    iconBg: 'bg-muted',
  },
}

const fallback: PageConfig = {
  icon: LayoutDashboard,
  subtitle: 'This section is coming soon.',
  iconColor: 'text-brand',
  iconBg: 'bg-brand-light',
}

interface BlankWorkspacePageProps {
  title: string
}

export function BlankWorkspacePage({ title }: BlankWorkspacePageProps) {
  const config = pageConfig[title] ?? fallback
  const Icon = config.icon

  return (
    <div className="flex flex-col h-full">
      {/* Per-page header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-brand-border bg-white">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', config.iconBg)}>
            <Icon className={cn('w-4.5 h-4.5', config.iconColor)} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-brand leading-tight">{title}</h1>
            <p className="text-xs text-brand-muted leading-tight mt-0.5">{config.subtitle}</p>
          </div>
        </div>

        {config.actionLabel && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {config.actionLabel}
          </button>
        )}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 bg-brand-surface/20">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', config.iconBg)}>
          <Icon className={cn('w-7 h-7', config.iconColor)} />
        </div>
        <div className="text-center max-w-xs">
          <h2 className="font-semibold text-brand text-base">Nothing here yet</h2>
          <p className="text-brand-muted text-sm mt-1.5 leading-relaxed">{config.subtitle}</p>
        </div>
        {config.actionLabel && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {config.actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
