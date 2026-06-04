'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type TemplateKey = 'GOOD_MORNING' | 'WELCOME_DM' | 'THREAD_SUMMARY' | 'CUSTOM'

export const TEMPLATES: Record<TemplateKey, { label: string; instruction: string; description: string }> = {
  GOOD_MORNING: {
    label: 'Good Morning Digest',
    description: 'Posts a friendly morning message to a channel',
    instruction:
      'Write a short, upbeat good morning message for the team. Mention today is {date}. Keep it under 3 sentences and make it motivating.',
  },
  WELCOME_DM: {
    label: 'Welcome New Member',
    description: 'Sends a welcome DM to the member who just joined',
    instruction:
      'Write a warm welcome message to {user.name} who just joined our workspace. Briefly introduce what the workspace is for and encourage them to say hello in the general channel. Keep it friendly and short.',
  },
  THREAD_SUMMARY: {
    label: 'Thread Summary',
    description: 'Summarizes messages in a channel when a keyword is triggered',
    instruction:
      'Summarize the recent conversation context in 2-3 bullet points. Be concise and focus on key decisions or action items.',
  },
  CUSTOM: {
    label: 'Custom',
    description: 'Write your own instruction from scratch',
    instruction: '',
  },
}

type Props = {
  value: TemplateKey
  onChange: (key: TemplateKey) => void
}

export function TemplatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const selected = TEMPLATES[value]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <span>{selected.label}</span>
        <ChevronDown className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tmpl]) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setOpen(false) }}
              className={cn(
                'flex w-full flex-col items-start px-4 py-3 text-left transition hover:bg-slate-50',
                key === value && 'bg-blue-50 hover:bg-blue-50',
              )}
            >
              <span className="text-sm font-medium text-slate-900">{tmpl.label}</span>
              <span className="mt-0.5 text-xs text-slate-500">{tmpl.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
