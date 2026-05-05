'use client'

import { ArrowUpRight, CheckCircle2, Clock3, Mail, MessageSquare, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const metrics = [
  { label: 'Open requests', value: '28', change: '+4', icon: Mail },
  { label: 'Team replies', value: '143', change: '+18%', icon: MessageSquare },
  { label: 'Resolved today', value: '19', change: '+7', icon: CheckCircle2 },
]

const queue = [
  { title: 'Billing workflow review', team: 'Operations', time: '12 min', tone: 'bg-primary/10 text-accent-txt' },
  { title: 'Enterprise onboarding', team: 'Customer success', time: '28 min', tone: 'bg-success/10 text-success' },
  { title: 'Design partner feedback', team: 'Product', time: '45 min', tone: 'bg-btn-hover text-muted' },
]

const activity = [
  'Mina assigned Product feedback to Alex',
  'Support inbox reached a two hour response streak',
  'Nolan closed the vendor approval checklist',
]

export default function DashboardPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-divider px-7 py-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">Workspace overview</p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-primary-text">Good evening, Serenity</h1>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-xl border border-divider px-3',
            'bg-panel text-sm font-medium text-primary-text',
            'transition-colors hover:bg-btn-hover focus-visible:border-focus focus-visible:outline-none',
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
              className="rounded-xl border border-divider bg-panel p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-btn-hover text-muted">
                  <metric.icon className="h-4 w-4" />
                </span>
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-accent-txt">
                  {metric.change}
                </span>
              </div>
              <p className="mt-5 text-sm text-muted">{metric.label}</p>
              <p className="mt-1 text-3xl font-semibold text-primary-text">{metric.value}</p>
            </section>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <section className="rounded-xl border border-divider bg-panel">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-primary-text">Priority queue</h2>
                <p className="mt-1 text-sm text-muted">Items that need a response today</p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-btn-hover hover:text-caption focus-visible:border focus-visible:border-focus focus-visible:outline-none"
                title="Open queue"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-divider">
              {queue.map(item => (
                <div key={item.title} className="flex items-center gap-4 px-5 py-4">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.tone)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary-text">{item.title}</p>
                    <p className="mt-1 truncate text-sm text-muted">{item.team}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-btn-hover px-2 py-1 text-xs text-muted">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-divider bg-panel p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-btn-hover text-muted">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-primary-text">Team pulse</h2>
                <p className="text-sm text-muted">24 members online</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {activity.map(item => (
                <div key={item} className="rounded-xl bg-btn-hover px-3 py-3 text-sm text-content">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-divider bg-surface p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-text">
                <Clock3 className="h-4 w-4 text-muted" />
                Next review
              </div>
              <p className="mt-2 text-sm text-muted">Today at 16:30 with the operations group.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
