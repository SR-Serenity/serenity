'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react'
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
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  DONE: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-gray-50 text-gray-400',
}

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-gray-300',
}

const ITEM_TYPE_BAR: Record<string, string> = {
  MEETING: 'bg-blue-400',
  EVENT: 'bg-gray-300',
  TASK: 'bg-amber-400',
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-end justify-between border-b border-gray-100 px-7 py-5">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{fmtDate(new Date().toISOString())}</p>
          <h1 className="mt-0.5 truncate text-2xl font-semibold text-gray-900">
            {user ? greeting(user.displayName) : 'Welcome back'}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">

          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-4 w-4 text-gray-300" />
                <span className="text-xs text-gray-400">
                  {dueToday.length > 0 ? `${dueToday.length} due today` : 'None due today'}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-gray-900">{activeTasks.length}</p>
              <p className="mt-1 text-sm text-gray-500">Active tasks</p>
            </div>

            <div className="rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <CalendarDays className="h-4 w-4 text-gray-300" />
                <span className="text-xs text-gray-400">
                  {todayItems.length === 0 ? 'No events' : `${todayItems.length} scheduled`}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-gray-900">{todayItems.length}</p>
              <p className="mt-1 text-sm text-gray-500">Events today</p>
            </div>

            <div className="rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <Users className="h-4 w-4 text-gray-300" />
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{currentOrg?.name}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-gray-900">
                {memberCount ?? '—'}
              </p>
              <p className="mt-1 text-sm text-gray-500">Team members</p>
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">

            {/* Today's schedule */}
            <div className="rounded-xl border border-gray-100">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Today's schedule</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {todayItems.length === 0
                    ? 'Nothing scheduled'
                    : `${todayItems.length} item${todayItems.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {todayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <CalendarDays className="h-8 w-8 text-gray-100" />
                  <p className="mt-3 text-sm text-gray-400">Your day is clear.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayItems.map(item => (
                    <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-14 shrink-0 pt-0.5 text-right">
                        <p className="text-xs font-medium tabular-nums text-gray-700">
                          {fmtTime(item.startAt)}
                        </p>
                        {item.endAt && (
                          <p className="text-xs tabular-nums text-gray-400">
                            {fmtTime(item.endAt)}
                          </p>
                        )}
                      </div>

                      <div className={cn('mt-1 w-0.5 self-stretch rounded-full', ITEM_TYPE_BAR[item.type] ?? 'bg-gray-200')} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
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
                          <p className="mt-1 truncate text-xs text-gray-400">
                            {item.attendees
                              .slice(0, 3)
                              .map(a => a.displayName)
                              .join(', ')}
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
            <div className="rounded-xl border border-gray-100">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">My tasks</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {activeTasks.length} active
                  {dueToday.length > 0 && ` · ${dueToday.length} due today`}
                </p>
              </div>

              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <CheckCircle2 className="h-8 w-8 text-gray-100" />
                  <p className="mt-3 text-sm text-gray-400">No tasks yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span
                        className={cn(
                          'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                          PRIORITY_DOT[task.priority],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm text-gray-900',
                            (task.status === 'DONE' || task.status === 'CANCELLED') &&
                              'text-gray-400 line-through',
                          )}
                        >
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p
                            className={cn(
                              'mt-0.5 text-xs',
                              task.dueDate.slice(0, 10) === todayStr && task.status !== 'DONE'
                                ? 'font-medium text-amber-600'
                                : 'text-gray-400',
                            )}
                          >
                            Due {fmtShortDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                          STATUS_CLS[task.status],
                        )}
                      >
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
