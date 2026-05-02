'use client'

import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileText,
  ListTodo,
  MessageSquare,
  Plus,
  Users,
  Video,
} from 'lucide-react'
import { formatDateLong, cn } from '@/lib/utils'
import { AvatarPill } from '@/app/(workspace)/components/avatar-pill'

const stats = [
  {
    label: 'Tasks due today',
    value: 8,
    icon: ListTodo,
    trend: '+2 from yesterday',
    trendUp: false,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    valueColor: 'text-amber-600',
  },
  {
    label: 'Unread messages',
    value: 3,
    icon: MessageSquare,
    trend: 'Last updated 5m ago',
    trendUp: null,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    valueColor: 'text-blue-600',
  },
  {
    label: 'Events today',
    value: 2,
    icon: Calendar,
    trend: 'Next at 3:00 PM',
    trendUp: null,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    valueColor: 'text-emerald-600',
  },
  {
    label: 'Team members',
    value: 12,
    icon: Users,
    trend: '10 online now',
    trendUp: null,
    iconColor: 'text-slate-950',
    iconBg: 'bg-slate-100',
    valueColor: 'text-slate-950',
  },
]

const activity = [
  {
    avatar: 'SC',
    name: 'Sarah Chen',
    action: 'completed task',
    target: '"Q2 Marketing Report"',
    time: '2m ago',
    type: 'complete',
  },
  {
    avatar: 'JM',
    name: 'James Miller',
    action: 'scheduled a meeting',
    target: '"Team Sync — Thursday 3PM"',
    time: '18m ago',
    type: 'calendar',
  },
  {
    avatar: 'AL',
    name: 'Anh Le',
    action: 'sent a message in',
    target: '#general',
    time: '42m ago',
    type: 'message',
  },
  {
    avatar: 'RP',
    name: 'Raj Patel',
    action: 'uploaded a file',
    target: '"Budget_FY2026.xlsx"',
    time: '1h ago',
    type: 'file',
  },
  {
    avatar: 'ME',
    name: 'Maria Espinoza',
    action: 'created task',
    target: '"Onboard new hire — Dev team"',
    time: '2h ago',
    type: 'task',
  },
]

const quickActions = [
  { icon: Plus, label: 'New Task', description: 'Add to your task list', color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Video, label: 'Schedule Meeting', description: 'Create a calendar event', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: MessageSquare, label: 'Send Message', description: 'Start a conversation', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: FileText, label: 'View Reports', description: 'Workspace analytics', color: 'text-slate-950', bg: 'bg-slate-100' },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 17) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 flex items-center justify-between gap-6 px-7 md:px-12 py-6 border-b border-brand-border bg-white">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-brand leading-snug">Dashboard</h1>
          <p className="text-base text-brand-muted leading-relaxed mt-1 max-w-2xl">
            Welcome back — here's what's happening today.
          </p>
        </div>
        <div className="shrink-0">
          <span className="text-sm text-brand-muted bg-white border border-brand-border px-4 py-2 rounded-full shadow-sm">
            {formatDateLong()}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-7 md:px-12 py-8 bg-brand-surface/40">
          <div className="mx-auto w-full max-w-[1120px] space-y-8">
            {/* Welcome banner */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 p-7 md:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-950/20 border border-slate-800/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.07),transparent_60%)]" />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-4xl font-semibold">
                  {getGreeting()}! 👋
                </h2>
                <p className="text-white/75 text-base md:text-lg mt-3 max-w-lg leading-relaxed">
                  Here's what's happening across your workspace today. Stay on top of your tasks and team.
                </p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl border border-slate-300 p-6 flex flex-col gap-3 hover:shadow-md transition-shadow group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}
                    >
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-950 transition-colors" />
                  </div>
                  <div className="relative z-10">
                    <p className={`text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1.5">{stat.label}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 relative z-10">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          stat.trendUp
                            ? 'bg-emerald-500'
                            : stat.trendUp === false
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                        )}
                      />
                      {stat.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity + Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Recent activity */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-300 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-950 text-sm">Recent Activity</h3>
                  <button
                    type="button"
                    className="text-sm text-slate-500 hover:text-slate-950 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {activity.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <AvatarPill initials={item.avatar} />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-slate-900 leading-relaxed">
                          <span className="font-medium">{item.name}</span>{' '}
                          <span className="text-slate-500">{item.action}</span>{' '}
                          <span className="font-medium text-slate-900">{item.target}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                      </div>
                      {item.type === 'complete' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm">
                <h3 className="font-semibold text-slate-950 text-sm mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}
                      >
                        <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-950 group-hover:text-slate-900 truncate">
                          {action.label}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
