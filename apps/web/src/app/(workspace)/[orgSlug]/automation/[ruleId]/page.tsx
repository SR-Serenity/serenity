'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { AutomationRule, CreateAutomationRuleInput } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { RuleForm } from '../components/rule-form'

export default function EditRulePage() {
  const { orgSlug, ruleId } = useParams<{ orgSlug: string; ruleId: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))

  const [rule, setRule] = useState<AutomationRule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRule = useCallback(async () => {
    if (!token) return
    try {
      const response = await automationApi.listRules(token)
      const found = response.rules.find(r => r.id === ruleId)
      if (!found) {
        router.push(`/${orgSlug}/automation`)
        return
      }
      setRule(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule')
    } finally {
      setLoading(false)
    }
  }, [orgSlug, ruleId, router, token])

  useEffect(() => {
    void loadRule()
  }, [loadRule])

  async function handleSave(input: CreateAutomationRuleInput) {
    if (!token || !rule) return
    setSaving(true)
    setError(null)
    try {
      await automationApi.updateRule(token, rule.id, input)
      router.push(`/${orgSlug}/automation`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading rule
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 scheme-light">
      <header className="flex min-h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6">
        <h1 className="text-xl font-semibold text-slate-950">Edit rule</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <RuleForm
            initialRule={rule ?? undefined}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={() => router.push(`/${orgSlug}/automation`)}
          />
        </div>
      </main>
    </div>
  )
}
