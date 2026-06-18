'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { AutomationRule } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { AutomationCanvas } from '../canvas/automation-canvas'

export default function EditRulePage() {
  const { orgSlug, ruleId } = useParams<{ orgSlug: string; ruleId: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(s => ({ token: s.token })))

  const [rule, setRule] = useState<AutomationRule | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRule = useCallback(async () => {
    if (!token) return
    try {
      const response = await automationApi.listRules(token)
      const found = response.rules.find(r => r.id === ruleId)
      if (!found) { router.push(`/${orgSlug}/automation`); return }
      setRule(found)
    } finally {
      setLoading(false)
    }
  }, [orgSlug, ruleId, router, token])

  useEffect(() => { void loadRule() }, [loadRule])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading rule
      </div>
    )
  }

  return <AutomationCanvas orgSlug={orgSlug} initialRule={rule ?? undefined} />
}
