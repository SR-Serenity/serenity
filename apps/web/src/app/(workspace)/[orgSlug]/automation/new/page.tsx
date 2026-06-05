'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { CreateAutomationRuleInput } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { RuleForm } from '../components/rule-form'
import { TemplateGrid } from '../components/template-grid'
import type { TemplatePreset } from '../components/templates'

export default function NewRulePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))

  const [template, setTemplate] = useState<TemplatePreset | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(input: CreateAutomationRuleInput) {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await automationApi.createRule(token, input)
      router.push(`/${orgSlug}/automation`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setSaving(false)
    }
  }

  // Step 1 — pick a template
  if (!template) {
    return (
      <div className="flex h-full flex-col bg-slate-50 scheme-light">
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
          <TemplateGrid
            onSelect={tmpl => setTemplate(tmpl)}
            onClose={() => router.push(`/${orgSlug}/automation`)}
          />
        </main>
      </div>
    )
  }

  // Step 2 — configure the rule
  return (
    <div className="flex h-full flex-col bg-slate-50 scheme-light">
      <header className="flex min-h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6">
        <h1 className="text-xl font-semibold text-slate-950">New automation rule</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <RuleForm
            templatePreset={template}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={() => setTemplate(null)}
          />
        </div>
      </main>
    </div>
  )
}
