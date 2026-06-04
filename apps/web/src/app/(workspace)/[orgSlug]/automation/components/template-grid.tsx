'use client'

import { ArrowRight, X } from 'lucide-react'
import { TEMPLATE_PRESETS, type TemplatePreset } from './templates'

type Props = {
  onSelect: (template: TemplatePreset) => void
  onClose: () => void
}

export function TemplateGrid({ onSelect, onClose }: Props) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">New automation rule</h2>
          <p className="mt-0.5 text-sm text-slate-500">Choose a template to get started, or build from scratch.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {TEMPLATE_PRESETS.map(tmpl => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onSelect(tmpl)}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm"
          >
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl ${tmpl.bgColor}`}>
              {tmpl.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{tmpl.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{tmpl.description}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-blue-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
