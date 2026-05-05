'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { ShellDivider, ShellSectionHeader } from './shell-primitives'

export interface NavItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  /** Unread / badge count */
  count?: number
  children?: NavItem[]
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

interface NavPanelProps {
  /** Section title shown at the top of the panel */
  title: string
  sections: NavSection[]
  currentPath: string
  /** Optional slot for header action buttons */
  headerActions?: ReactNode
  /** Optional footer slot */
  footer?: ReactNode
}

function NavGroup({
  section,
  currentPath,
}: {
  section: NavSection
  currentPath: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex flex-col shrink-0 w-full min-w-0 min-h-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center justify-between shrink-0 w-full',
          'border-none outline-none bg-transparent cursor-pointer',
          'px-4 py-2',
          'min-h-10',
          'transition-colors duration-150',
          'hover:bg-nav-hover',
          'group',
        )}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={cn(
              'flex items-center justify-center shrink-0',
              'w-5 h-5 rounded-sm',
              'border border-transparent transition-all duration-100',
              'text-disabled-text',
              'group-hover:bg-ui',
              'group-hover:text-subtle-label',
            )}
          >
            <ChevronRight
              className={cn(
                'w-3 h-3 transition-transform duration-100',
                open ? 'rotate-90' : 'rotate-0',
              )}
            />
          </span>

          {/* label — uppercase, tertiary text color */}
          <span
            className={cn(
              'inline-flex items-center min-w-0',
              'px-1 py-0.5',
              'text-xs font-medium uppercase tracking-[0.08em]',
              'text-tertiary-text',
              'rounded-sm',
              'transition-colors duration-150',
              'group-hover:bg-ui-hover',
              'group-hover:text-primary-text',
            )}
          >
            {section.label}
          </span>
        </div>
      </button>

      {open && (
        <div className="flex flex-col min-w-0 overflow-hidden">
          {section.items.map(item => (
            <NavItemRow
              key={item.id}
              item={item}
              currentPath={currentPath}
              depth={0}
            />
          ))}
          <div className="h-3" />
        </div>
      )}
    </div>
  )
}

/** Single row inside the navigation tree with optional nested children. */
function NavItemRow({
  item,
  currentPath,
  depth,
}: {
  item: NavItem
  currentPath: string
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = !!item.children?.length
  const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
  const Icon = item.icon

  return (
    <>
      <div
        className={cn(
          'flex items-center shrink-0 min-w-0',
          'mx-3 px-3',
          'h-8 min-h-8 rounded-md',
          'cursor-pointer select-none',
          'transition-colors duration-150',
          isActive
            ? 'bg-nav-selected'
            : 'hover:bg-nav-hover',
          depth > 0 && 'pl-10',
        )}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className={cn(
              'flex items-center justify-center shrink-0 mr-1.5',
              'w-4 h-4 rounded-sm',
              'text-trans hover:text-caption',
              'hover:bg-btn-hover',
              'transition-colors duration-150 outline-none',
            )}
          >
            <ChevronRight
              className={cn(
                'w-3 h-3 transition-transform duration-100',
                open ? 'rotate-90' : 'rotate-0',
              )}
            />
          </button>
        )}

        {Icon && (
          <span
            className={cn(
              'shrink-0 mr-2 w-4 h-4',
              'transition-colors duration-150',
              isActive
                ? 'text-caption'
                : 'text-muted',
            )}
          >
            <Icon className="w-4 h-4" />
          </span>
        )}

        <Link
          href={item.href}
          className={cn(
            'flex-1 min-w-0 text-left outline-none',
            'text-sm whitespace-nowrap overflow-hidden text-ellipsis',
            'transition-colors duration-150',
            isActive
              ? 'text-caption font-medium'
              : 'text-content',
          )}
        >
          {item.label}
        </Link>

        {item.count != null && item.count > 0 && (
          <span
            className={cn(
              'shrink-0 ml-3',
              'text-xs font-semibold',
              'text-content',
            )}
          >
            {item.count}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className="flex flex-col min-w-0">
          {item.children?.map(child => (
            <NavItemRow
              key={child.id}
              item={child}
              currentPath={currentPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}

/** Collapsible section panel shown beside the app dock. */
export function NavPanel({
  title,
  sections,
  currentPath,
  headerActions,
  footer,
}: NavPanelProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col h-full',
        'bg-nav',
        'border-l border-nav-border',
        'w-70',
        'min-w-50 max-w-90',
      )}
    >
      <div className="flex flex-col w-full h-full min-w-0 min-h-0">
        <ShellSectionHeader title={title} actions={headerActions} />

        <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
          <ShellDivider />

          {sections.map(section => (
            <NavGroup key={section.id} section={section} currentPath={currentPath} />
          ))}
        </div>

        <div className="flex flex-col shrink-0">
          <ShellDivider />
          {footer && (
            <div className="flex flex-col py-2 px-0 pb-5">{footer}</div>
          )}
        </div>
      </div>
    </div>
  )
}
