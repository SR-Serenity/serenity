'use client'

import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Plus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const metrics = [
  { label: 'Open requests', value: '28', change: '+4', icon: Mail, tone: 'bg-blue-50 text-blue-700' },
  { label: 'Team replies', value: '143', change: '+18%', icon: MessageSquare, tone: 'bg-violet-50 text-violet-700' },
  { label: 'Resolved today', value: '19', change: '+7', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
]

const queue = [
  { title: 'Billing workflow review', team: 'Operations', time: '12 min', tone: 'bg-blue-600' },
  { title: 'Enterprise onboarding', team: 'Customer success', time: '28 min', tone: 'bg-emerald-600' },
  { title: 'Design partner feedback', team: 'Product', time: '45 min', tone: 'bg-violet-600' },
]

const activity = [
  'Mina assigned Product feedback to Alex',
  'Support inbox reached a two hour response streak',
  'Nolan closed the vendor approval checklist',
]

export default function DashboardPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-slate-900 [color-scheme:light] [--highlight-hover:#f8fafc] [--theme-bg-color:#ffffff] [--theme-button-border:#cbd5e1] [--theme-button-default:#f8fafc] [--theme-caption-color:#0f172a] [--theme-content-color:#0f172a] [--theme-divider-color:#e2e8f0] [--theme-darker-color:#64748b] [--theme-list-row-color:#ffffff] [--theme-panel-color:#ffffff]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] px-7 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-[var(--theme-darker-color)]">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Workspace overview
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold text-[var(--theme-caption-color)]">Good evening, Serenity</h1>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--theme-divider-color)] px-3',
            'bg-[var(--theme-panel-color)] text-sm font-medium text-[var(--theme-caption-color)]',
            'transition-colors hover:bg-[var(--highlight-hover)] focus-visible:border-blue-600 focus-visible:outline-none',
          )}
        >
          <Plus className="h-4 w-4" />
          New item
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {metrics.map(metric => (
            <section
              key={metric.label}
              className="rounded-lg border border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', metric.tone)}>
                  <metric.icon className="h-4 w-4" />
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  {metric.change}
                </span>
              </div>
              <p className="mt-5 text-sm text-[var(--theme-darker-color)]">{metric.label}</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--theme-caption-color)]">{metric.value}</p>
            </section>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <section className="rounded-lg border border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)]">
            <div className="flex items-center justify-between border-b border-[var(--theme-divider-color)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--theme-caption-color)]">Priority queue</h2>
                <p className="mt-1 text-sm text-[var(--theme-darker-color)]">Items that need a response today</p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--theme-darker-color)] transition-colors hover:bg-[var(--highlight-hover)] hover:text-[var(--theme-caption-color)] focus-visible:border focus-visible:border-blue-600 focus-visible:outline-none"
                title="Open queue"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-[var(--theme-divider-color)]">
              {queue.map(item => (
                <button key={item.title} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--highlight-hover)]">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.tone)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--theme-caption-color)]">{item.title}</p>
                    <p className="mt-1 truncate text-sm text-[var(--theme-darker-color)]">{item.team}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-[var(--theme-darker-color)]">
                    {item.time}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[var(--theme-caption-color)]">Team pulse</h2>
                <p className="text-sm text-[var(--theme-darker-color)]">24 members online</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {activity.map(item => (
                <div key={item} className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-[var(--theme-content-color)]">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-[var(--theme-divider-color)] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-caption-color)]">
                <Clock3 className="h-4 w-4 text-[var(--theme-darker-color)]" />
                Next review
              </div>
              <p className="mt-2 text-sm text-[var(--theme-darker-color)]">Today at 16:30 with the operations group.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
