'use client'

import { useEffect, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { AutomationTriggerType, AutomationActionType } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/app/shared/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
  onGenerate: (name: string, nodes: Node[], edges: Edge[]) => void
  conversations: { id: string; name: string | null }[]
  members: { id: string; displayName: string }[]
  initialPrompt?: string
}

const EXAMPLES = [
  'Send a daily standup reminder to #general every morning at 9am',
  'When a new member joins, send them a welcome DM with onboarding tips',
  'When a task is marked done, post a congratulations message to #general',
  'Every Monday, summarize last week and post to #team-updates',
]

export function AiGenerateModal({ open, onClose, onGenerate, conversations, members, initialPrompt }: Props) {
  const { token } = useAuthStore(useShallow(s => ({ token: s.token })))
  const [description, setDescription] = useState(initialPrompt ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialPrompt) setDescription(initialPrompt)
  }, [initialPrompt])

  if (!open) return null

  async function handleGenerate() {
    if (!token || !description.trim()) return
    setLoading(true)
    setError(null)

    try {
      const result = await automationApi.suggestRule(token, description.trim())
      if (!result.stepsGraph || !result.stepsGraph.nodes.length) {
        setError('AI could not generate a workflow. Try describing it differently.')
        setLoading(false)
        return
      }

      const nodes: Node[] = result.stepsGraph.nodes.map(n => ({
        id: n.id,
        type: n.type === 'trigger' ? 'triggerNode' : 'actionNode',
        position: n.position,
        data: {
          nodeType: n.nodeType as AutomationTriggerType | AutomationActionType,
          config: n.config,
          conversations,
          members,
        },
      }))
      const edges: Edge[] = result.stepsGraph.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'automationEdge',
      }))

      onGenerate(result.name, nodes, edges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Generate with AI</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Describe your workflow in plain English</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g. Every morning at 9am, post a standup reminder to #general…"
            autoFocus
            className="w-full resize-none rounded-xl border border-border bg-[var(--input-BackgroundColor)] px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-all duration-150 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          />

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try an example:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  className="rounded-full border border-border bg-popup-hover px-3 py-1 text-xs text-muted-foreground transition-all duration-150 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-400 active:scale-95"
                >
                  {ex.length > 48 ? ex.slice(0, 48) + '…' : ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!description.trim() || loading}
            onClick={handleGenerate}
            className="gap-1.5 bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97] disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Sparkles className="h-4 w-4" /> Generate</>
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
