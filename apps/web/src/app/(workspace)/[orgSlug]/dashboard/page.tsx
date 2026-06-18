'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CalendarDays, CheckCircle2, Loader2, MapPin, Users } from 'lucide-react'
import { calendarApi, orgApi, tasksApi } from '@serenity/api'
import type { CalendarItem, Task } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

function greeting(name: string) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name.split(' ')[0]}`
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}

const STATUS_CLS: Record<string, string> = {
  TODO: 'bg-ui text-muted-foreground',
  IN_PROGRESS: 'bg-accent/10 text-accent-txt',
  DONE: 'bg-success/10 text-success',
  CANCELLED: 'bg-ui/50 text-disabled-text',
}

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-dimmed',
}

const ITEM_TYPE_BAR: Record<string, string> = {
  MEETING: 'bg-accent',
  EVENT: 'bg-muted-foreground',
  TASK: 'bg-[var(--theme-warning-color)]',
}

export default function DashboardPage() {
  const { token, user, currentOrg } = useAuthStore(
    useShallow(s => ({ token: s.token, user: s.user, currentOrg: s.currentOrg })),
  )

  const [todayItems, setTodayItems] = useState<CalendarItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !currentOrg) return

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    setLoading(true)
    Promise.all([
      calendarApi.listItems(token, { from: start.toISOString(), to: end.toISOString() }),
      tasksApi.listTasks(token, { mine: true }),
      orgApi.listMembers(currentOrg.id, token),
    ])
      .then(([cal, t, members]) => {
        setTodayItems(
          cal.items
            .filter(i => i.type !== 'TASK')
            .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? '')),
        )
        setTasks(t.tasks)
        setMemberCount(members.members.length)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [token, currentOrg?.id])

  const todayStr = new Date().toISOString().slice(0, 10)
  const activeTasks = tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS')
  const dueToday = tasks.filter(
    t => t.dueDate?.slice(0, 10) === todayStr && t.status !== 'DONE' && t.status !== 'CANCELLED',
  )
  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      {/* Header */}
      <div className="flex shrink-0 items-end justify-between px-7 pb-4 pt-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{fmtDate(new Date().toISOString())}</p>
          <h1 className="mt-1 truncate text-xl font-semibold text-foreground">
            {user ? greeting(user.displayName) : 'Welcome back'}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-7 pb-8">

          {/* Metric cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: <CheckCircle2 className="h-4 w-4 text-accent-txt" />,
                badge: dueToday.length > 0 ? `${dueToday.length} due today` : 'None due today',
                value: activeTasks.length,
                label: 'Active tasks',
              },
              {
                icon: <CalendarDays className="h-4 w-4 text-accent-txt" />,
                badge: todayItems.length === 0 ? 'No events' : `${todayItems.length} scheduled`,
                value: todayItems.length,
                label: 'Events today',
              },
              {
                icon: <Users className="h-4 w-4 text-accent-txt" />,
                badge: currentOrg?.name ?? '',
                value: memberCount ?? '—',
                label: 'Team members',
              },
            ].map(({ icon, badge, value, label }) => (
              <div key={label} className="rounded-lg border border-black/10 p-4 transition-all duration-150 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  {icon}
                  <span className="max-w-[120px] truncate text-[11px] text-muted-foreground">{badge}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">

            {/* Today's schedule */}
            <div className="rounded-lg border border-black/10">
              <div className="border-b border-black/10 px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground">Today's schedule</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {todayItems.length === 0
                    ? 'Nothing scheduled'
                    : `${todayItems.length} item${todayItems.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {todayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="h-7 w-7 text-divider" />
                  <p className="mt-2 text-[13px] text-muted-foreground">Your day is clear.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06]">
                  {todayItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-ui/50">
                      <div className="w-12 shrink-0 pt-0.5 text-right">
                        <p className="text-[11px] font-medium tabular-nums text-foreground">
                          {fmtTime(item.startAt)}
                        </p>
                        {item.endAt && (
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {fmtTime(item.endAt)}
                          </p>
                        )}
                      </div>

                      <div className={cn('mt-1 w-0.5 self-stretch rounded-full', ITEM_TYPE_BAR[item.type] ?? 'bg-divider')} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="capitalize">{item.type.toLowerCase()}</span>
                          {item.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {item.location}
                            </span>
                          )}
                          {item.room && !item.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {item.room.name}
                            </span>
                          )}
                        </div>
                        {item.attendees.length > 0 && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {item.attendees.slice(0, 3).map(a => a.displayName).join(', ')}
                            {item.attendees.length > 3 && ` +${item.attendees.length - 3} more`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My tasks */}
            <div className="rounded-lg border border-black/10">
              <div className="border-b border-black/10 px-4 py-3">
                <h2 className="text-[13px] font-semibold text-foreground">My tasks</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {activeTasks.length} active
                  {dueToday.length > 0 && ` · ${dueToday.length} due today`}
                </p>
              </div>

              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-7 w-7 text-divider" />
                  <p className="mt-2 text-[13px] text-muted-foreground">No tasks yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06]">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex items-start gap-2.5 px-4 py-3 transition-colors duration-150 hover:bg-ui/50">
                      <span
                        className={cn('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[task.priority])}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'truncate text-[13px] text-foreground',
                          (task.status === 'DONE' || task.status === 'CANCELLED') && 'text-muted-foreground line-through',
                        )}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className={cn(
                            'mt-0.5 text-[11px]',
                            task.dueDate.slice(0, 10) === todayStr && task.status !== 'DONE'
                              ? 'font-medium text-amber-500'
                              : 'text-muted-foreground',
                          )}>
                            Due {fmtShortDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_CLS[task.status])}>
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
