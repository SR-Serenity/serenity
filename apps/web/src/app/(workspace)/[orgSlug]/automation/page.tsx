'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, Zap } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { AutomationRule } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/app/shared/components/ui/button'
import { RuleRow } from './components/rule-row'

export default function AutomationPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))

  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await automationApi.listRules(token)
      setRules(response.rules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation rules')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  async function handleToggle(rule: AutomationRule) {
    if (!token) return
    try {
      const updated = await automationApi.toggleRule(token, rule.id, !rule.enabled)
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle rule')
    }
  }

  async function handleDelete(rule: AutomationRule) {
    if (!token) return
    try {
      await automationApi.deleteRule(token, rule.id)
      setRules(prev => prev.filter(r => r.id !== rule.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 scheme-light">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Automation</h1>
          <p className="text-xs text-slate-500">{rules.length} {rules.length === 1 ? 'rule' : 'rules'}</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/automation/new`)}
          className="h-9 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          New rule
        </Button>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div>
      )}

      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading rules
          </div>
        ) : rules.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <Zap className="size-10 text-slate-300" />
            <h2 className="mt-4 text-base font-semibold text-slate-950">No automation rules yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your first rule to automate workspace tasks with AI.
            </p>
            <Button
              onClick={() => router.push(`/${orgSlug}/automation/new`)}
              className="mt-4 h-9 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              New rule
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Trigger</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onEdit={() => router.push(`/${orgSlug}/automation/${rule.id}`)}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
