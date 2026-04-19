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
import { formatDateLong } from '@/lib/utils'
import { AvatarPill } from '@/components/workspace/avatar-pill'

const stats = [
  {
    label: 'Tasks due today',
    value: 8,
    icon: ListTodo,
    trend: '+2 from yesterday',
    trendUp: false,
    iconColor: 'text-warning',
    iconBg: 'bg-warning-light',
    valueColor: 'text-warning',
  },
  {
    label: 'Unread messages',
    value: 3,
    icon: MessageSquare,
    trend: 'Last updated 5m ago',
    trendUp: null,
    iconColor: 'text-info',
    iconBg: 'bg-info-light',
    valueColor: 'text-info',
  },
  {
    label: 'Events today',
    value: 2,
    icon: Calendar,
    trend: 'Next at 3:00 PM',
    trendUp: null,
    iconColor: 'text-success',
    iconBg: 'bg-success-light',
    valueColor: 'text-success',
  },
  {
    label: 'Team members',
    value: 12,
    icon: Users,
    trend: '10 online now',
    trendUp: null,
    iconColor: 'text-brand',
    iconBg: 'bg-brand-light',
    valueColor: 'text-brand',
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
  { icon: Plus, label: 'New Task', description: 'Add to your task list', color: 'text-warning', bg: 'bg-warning-light' },
  { icon: Video, label: 'Schedule Meeting', description: 'Create a calendar event', color: 'text-info', bg: 'bg-info-light' },
  { icon: MessageSquare, label: 'Send Message', description: 'Start a conversation', color: 'text-success', bg: 'bg-success-light' },
  { icon: FileText, label: 'View Reports', description: 'Workspace analytics', color: 'text-brand', bg: 'bg-brand-light' },
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
    <div className="flex flex-col h-full">
      {/* Dashboard page header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-brand-border bg-white">
        <div>
          <h1 className="text-base font-semibold text-brand leading-tight">Dashboard</h1>
          <p className="text-xs text-brand-muted leading-tight mt-0.5">Welcome back — here's what's happening today.</p>
        </div>
        <span className="text-xs text-brand-muted">{formatDateLong()}</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-brand-surface/30 p-6 md:p-8 space-y-6">
        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-br from-brand via-brand-hover to-[oklch(0.22_0.12_264)] p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(1_0_0/0.07),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}! 👋
            </h2>
            <p className="text-white/70 text-sm mt-2 max-w-md">
            Here's what's happening across your workspace today. Stay on top of your tasks and team.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-brand-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-brand-muted/40" />
              </div>
              <div>
                <p className={`text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                <p className="text-xs font-medium text-brand-muted mt-0.5">{stat.label}</p>
              </div>
              <p className="text-[11px] text-brand-muted/70 border-t border-brand-border pt-2">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Activity + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent activity */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-brand text-sm">Recent Activity</h3>
              <button
                type="button"
                className="text-xs text-brand-muted hover:text-brand transition-colors"
              >
              View all
              </button>
            </div>
            <div className="space-y-4">
              {activity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <AvatarPill initials={item.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand leading-snug">
                      <span className="font-medium">{item.name}</span>{' '}
                      <span className="text-brand-muted">{item.action}</span>{' '}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <p className="text-[11px] text-brand-muted/60 mt-0.5">{item.time}</p>
                  </div>
                  {item.type === 'complete' && (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-brand-border p-5">
            <h3 className="font-semibold text-brand text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="w-full flex items-center gap-3 rounded-xl border border-brand-border px-4 py-3 hover:bg-brand-surface/60 hover:border-brand/20 transition-all text-left group"
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${action.bg} flex items-center
                  justify-center shrink-0`}
                  >
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand group-hover:text-brand truncate">{action.label}</p>
                    <p className="text-[11px] text-brand-muted truncate">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
