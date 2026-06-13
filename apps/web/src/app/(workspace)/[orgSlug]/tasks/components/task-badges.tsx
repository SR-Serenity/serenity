import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  MinusCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { TaskPriority, TaskSourceType, TaskStatus } from '@serenity/api'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotClass: string; pillClass: string; icon: LucideIcon }
> = {
  TODO: {
    label: 'To do',
    dotClass: 'bg-slate-400',
    pillClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'In progress',
    dotClass: 'bg-blue-500',
    pillClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    icon: Clock,
  },
  DONE: {
    label: 'Done',
    dotClass: 'bg-emerald-500',
    pillClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    dotClass: 'bg-slate-300',
    pillClass: 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500',
    icon: MinusCircle,
  },
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; dotClass: string; pillClass: string }
> = {
  LOW: {
    label: 'Low',
    dotClass: 'bg-slate-400',
    pillClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  MEDIUM: {
    label: 'Medium',
    dotClass: 'bg-amber-400',
    pillClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  HIGH: {
    label: 'High',
    dotClass: 'bg-rose-500',
    pillClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
}

const SOURCE_META: Record<TaskSourceType, { label: string; icon: LucideIcon | null }> = {
  MANUAL: { label: 'Manual', icon: null },
  CHAT: { label: 'Chat', icon: MessageSquare },
  WIKI: { label: 'Wiki', icon: FileText },
  EMAIL: { label: 'Email', icon: Mail },
  CALENDAR: { label: 'Calendar', icon: Calendar },
  DOCUMENT: { label: 'Document', icon: FileText },
  AI: { label: 'AI', icon: Sparkles },
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <Pill className={cfg.pillClass}>
      <span className={cn('size-1.5 shrink-0 rounded-full', cfg.dotClass)} />
      {cfg.label}
    </Pill>
  )
}

export function StatusDot({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return <Icon className={cn('size-4 shrink-0', status === 'DONE' ? 'text-emerald-500' : status === 'IN_PROGRESS' ? 'text-blue-500' : status === 'CANCELLED' ? 'text-slate-300' : 'text-slate-400')} />
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <Pill className={cfg.pillClass}>
      <span className={cn('size-1.5 shrink-0 rounded-full', cfg.dotClass)} />
      {cfg.label}
    </Pill>
  )
}

export function PriorityBar({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        'inline-block h-3.5 w-1 shrink-0 rounded-full',
        priority === 'HIGH' && 'bg-rose-500',
        priority === 'MEDIUM' && 'bg-amber-400',
        priority === 'LOW' && 'bg-slate-300',
      )}
      title={priority.charAt(0) + priority.slice(1).toLowerCase()}
    />
  )
}

export function SourceBadge({ sourceType }: { sourceType: TaskSourceType }) {
  const meta = SOURCE_META[sourceType]
  const Icon = meta.icon
  return (
    <Pill className="border border-border bg-background text-muted-foreground">
      {Icon ? <Icon className="size-3" /> : null}
      {meta.label}
    </Pill>
  )
}

export function AiBadge() {
  return (
    <Pill className="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
      <Sparkles className="size-3" />
      AI
    </Pill>
  )
}
