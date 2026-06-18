'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react'
import type { Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2, Save, ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useChatStore } from '@/stores/chat-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAutomationCanvasStore } from '@/stores/automation-canvas-store'
import { Button } from '@/app/shared/components/ui/button'
import { TriggerNode } from './nodes/trigger-node'
import { ActionNode } from './nodes/action-node'
import { AutomationEdge } from './edges/automation-edge'
import { AiGenerateModal } from './ai-generate-modal'
import type { AutomationRule } from '@serenity/api'
import { ruleToGraph } from './utils/rule-to-graph'

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
}

const edgeTypes = {
  automationEdge: AutomationEdge,
}

type Props = {
  orgSlug: string
  initialRule?: AutomationRule
}

export function AutomationCanvas({ orgSlug, initialRule }: Props) {
  const router = useRouter()
  const { token, currentOrg } = useAuthStore(useShallow(s => ({ token: s.token, currentOrg: s.currentOrg })))
  const { conversations, loadConversations } = useChatStore(useShallow(s => ({ conversations: s.conversations, loadConversations: s.loadConversations })))
  const { membersByOrgId, loadMembers } = useWorkspaceStore(useShallow(s => ({ membersByOrgId: s.membersByOrgId, loadMembers: s.loadMembers })))
  const members = (currentOrg ? (membersByOrgId[currentOrg.id] ?? []) : [])

  const { ruleName, saving, error, setRuleName, resetCanvas, save } = useAutomationCanvasStore(
    useShallow(s => ({
      ruleName: s.ruleName,
      saving: s.saving,
      error: s.error,
      setRuleName: s.setRuleName,
      resetCanvas: s.resetCanvas,
      save: s.save,
    }))
  )

  const initialGraph = useMemo(() => {
    if (initialRule) return ruleToGraph(initialRule)
    return {
      nodes: [{
        id: 'trigger-1',
        type: 'triggerNode' as const,
        position: { x: 250, y: 80 },
        data: { nodeType: 'SCHEDULE', config: { frequency: 'daily', time: '09:00', cron: '0 9 * * *' } },
      }],
      edges: [],
    }
  }, [initialRule])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  useEffect(() => {
    if (initialRule) {
      setRuleName(initialRule.name)
    }
    return () => { resetCanvas() }
  }, [initialRule, setRuleName, resetCanvas])

  useEffect(() => {
    if (token && conversations.length === 0) loadConversations(token).catch(() => undefined)
    if (token && currentOrg && members.length === 0) loadMembers(currentOrg.id, token).catch(() => undefined)
  }, [token, conversations.length, loadConversations, members.length, loadMembers])

  const channels = conversations
    .filter(c => c.type === 'PUBLIC_CHANNEL' || c.type === 'PRIVATE_CHANNEL')
    .map(c => ({ id: c.id, name: c.name ?? null }))

  // Inject context data into action nodes
  const enrichedNodes = useMemo(() => nodes.map(n => {
    if (n.type === 'actionNode') {
      return { ...n, data: { ...n.data, conversations: channels, members } }
    }
    return n
  }), [nodes, channels, members])

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge({ ...connection, type: 'automationEdge' }, eds)),
    [setEdges],
  )

  function addActionNode() {
    const lastNode = nodes[nodes.length - 1]
    const newId = `action-${Date.now()}`
    const newNode = {
      id: newId,
      type: 'actionNode' as const,
      position: { x: (lastNode?.position.x ?? 250), y: (lastNode?.position.y ?? 80) + 220 },
      data: { nodeType: 'AI_AGENT' as const, config: {}, conversations: channels, members },
    }
    setNodes(ns => [...ns, newNode])
    if (lastNode) {
      setEdges(es => [...es, { id: `${lastNode.id}->${newId}`, source: lastNode.id, target: newId, type: 'automationEdge' }])
    }
  }

  async function handleSave() {
    if (!token) return
    // Sync canvas store with current local node/edge state
    useAutomationCanvasStore.setState({ nodes, edges })
    const ruleId = await save(token, initialRule?.id)
    if (ruleId) router.push(`/${orgSlug}/automation`)
  }

  function handleAiGenerate(name: string, newNodes: typeof nodes, newEdges: typeof edges) {
    setRuleName(name)
    setNodes(newNodes)
    setEdges(newEdges)
    setAiModalOpen(false)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 scheme-light">
      {/* Toolbar */}
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="size-8 p-0" onClick={() => router.push(`/${orgSlug}/automation`)}>
            <ArrowLeft className="size-4" />
          </Button>
          <input
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            placeholder="Rule name…"
            className="w-56 border-0 border-b border-transparent bg-transparent px-0 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-sm"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles className="size-3.5 text-purple-500" />
            Generate with AI
          </Button>
          <Button
            variant="outline"
            className="h-8 gap-1.5 rounded-lg px-3 text-sm"
            onClick={addActionNode}
          >
            <Plus className="size-3.5" />
            Add action
          </Button>
          <Button
            disabled={saving || !ruleName.trim()}
            onClick={handleSave}
            className="h-8 min-w-20 gap-1.5 rounded-lg bg-blue-600 px-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Canvas */}
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{ type: 'automationEdge' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          <Controls className="rounded-lg border border-slate-200 bg-white shadow-sm" />
          <MiniMap nodeStrokeWidth={3} className="rounded-lg border border-slate-200" />
        </ReactFlow>
      </div>

      <AiGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={handleAiGenerate}
        conversations={channels}
        members={members}
      />
    </div>
  )
}
