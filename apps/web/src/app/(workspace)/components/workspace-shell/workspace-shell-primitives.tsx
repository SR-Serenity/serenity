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
  disabled?: boolean
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
  disabled = false,
  className,
  id,
}: ShellIconActionButtonProps) {
  const isCopilot = id === 'copilot' || title.toLowerCase() === 'copilot'

  const classes = cn(
    'relative flex items-center justify-center shrink-0 cursor-pointer group',
    'w-8 h-8 rounded-lg border border-transparent outline-none',
    'transition-all duration-150 ease-out',
    'focus-visible:border-focus focus-visible:bg-primary/10',
    isCopilot
      ? (active ? 'bg-primary/10 text-accent-txt' : 'bg-transparent text-nav-icon hover:bg-btn-hover hover:text-caption')
      : active
        ? 'bg-primary/10 text-accent-txt'
        : 'bg-transparent text-nav-icon hover:bg-btn-hover hover:text-caption',
    disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-nav-icon',
    className,
  )

  const iconClasses = cn(
    'h-4 w-4',
    isCopilot ? 'text-gray-600 group-hover:text-gray-900' : ''
  )

  if (as === 'link' && href) {
    return (
      <Link href={href} id={id} title={title} className={classes}>
        <Icon className={iconClasses} />
      </Link>
    )
  }

  return (
    <button type="button" id={id} title={title} onClick={onClick} disabled={disabled} className={classes}>
      <Icon className={iconClasses} />
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
        'px-4 py-3',
        'font-semibold leading-5 text-sm',
        'text-primary-text',
        actions ? '' : 'min-h-12',
      )}
      style={{ textRendering: 'optimizeLegibility' }}
    >
      <span className="truncate overflow-hidden">{title}</span>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  )
}
