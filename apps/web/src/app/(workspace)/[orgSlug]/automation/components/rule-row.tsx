'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { AutomationRule, AutomationTriggerType } from '@serenity/api'
import { cn } from '@/lib/utils'

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  SCHEDULE: 'Schedule',
  MEMBER_JOINED: 'Member joins',
  MESSAGE_KEYWORD: 'Keyword match',
}

type Props = {
  rule: AutomationRule
  onToggle: (rule: AutomationRule) => void
  onEdit: () => void
  onDelete: (rule: AutomationRule) => void
}

export function RuleRow({ rule, onToggle, onEdit, onDelete }: Props) {
  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium text-slate-900">{rule.name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {TRIGGER_LABELS[rule.triggerType]}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onToggle(rule)}
          className="flex items-center gap-2 text-sm"
          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
        >
          <span
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
              rule.enabled ? 'bg-blue-600' : 'bg-slate-200',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                rule.enabled ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </span>
          <span className={cn('text-xs', rule.enabled ? 'text-blue-600' : 'text-slate-400')}>
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Edit rule"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            title="Delete rule"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
