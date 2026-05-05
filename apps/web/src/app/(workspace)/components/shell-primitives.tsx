import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ShellIconActionButtonProps {
  title: string
  icon: LucideIcon
  onClick?: () => void
  as?: 'button' | 'link'
  href?: string
  active?: boolean
  className?: string
  id?: string
}

export function ShellIconActionButton({
  title,
  icon: Icon,
  onClick,
  as = 'button',
  href,
  active = false,
  className,
  id,
}: ShellIconActionButtonProps) {
  const classes = cn(
    'relative flex items-center justify-center shrink-0 cursor-pointer group',
    'w-9 h-9 rounded border border-transparent outline-none',
    'transition-colors duration-150',
    active
      ? 'bg-btn-pressed text-caption'
      : 'bg-transparent text-nav-icon hover:bg-btn-hover hover:text-caption',
    className,
  )

  if (as === 'link' && href) {
    return (
      <Link href={href} id={id} title={title} className={classes}>
        <Icon className="w-4 h-4" />
      </Link>
    )
  }

  return (
    <button type="button" id={id} title={title} onClick={onClick} className={classes}>
      <Icon className="w-4 h-4" />
    </button>
  )
}

export function ShellDivider({ className }: { className?: string }) {
  return (
    <div className={cn('shrink-0 w-full h-px bg-nav-divider', className)} />
  )
}

interface ShellSectionHeaderProps {
  title: string
  actions?: ReactNode
}

export function ShellSectionHeader({ title, actions }: ShellSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between shrink-0',
        'px-5 py-3',
        'font-bold leading-6 text-xl',
        'text-primary-text',
        actions ? '' : 'min-h-17',
      )}
      style={{ textRendering: 'optimizeLegibility' }}
    >
      <span className="truncate overflow-hidden">{title}</span>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  )
}
