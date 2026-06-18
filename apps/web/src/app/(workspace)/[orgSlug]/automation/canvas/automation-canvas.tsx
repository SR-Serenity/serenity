'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import type { Connection, NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2, ArrowLeft, Sparkles, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useChatStore } from '@/stores/chat-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAutomationCanvasStore } from '@/stores/automation-canvas-store'
import { TriggerNode } from './nodes/trigger-node'
import { ActionNode } from './nodes/action-node'
import { ConditionNode } from './nodes/condition-node'
import { AutomationEdge } from './edges/automation-edge'
import { NodePanel } from './components/node-panel'
import { NodePalette } from './components/node-palette'
import { AiGenerateModal } from './ai-generate-modal'
import type { AutomationRule } from '@serenity/api'
import { ruleToGraph } from './utils/rule-to-graph'
import { WORKFLOW_TEMPLATES } from '../components/workflow-templates'
import { cn } from '@/lib/utils'

const nodeTypes = { triggerNode: TriggerNode, actionNode: ActionNode, conditionNode: ConditionNode }
const edgeTypes = { automationEdge: AutomationEdge }

const NODE_HEIGHT    = 120
const STEP_GAP       = 60
const CANVAS_CENTER_X = 300

type Props = {
  orgSlug: string
  initialRule?: AutomationRule
  initialPrompt?: string
  initialName?: string
  templateId?: string
  blank?: boolean
}

type PanelTarget = { nodeId: string; nodeKind: 'trigger' | 'condition' | 'action'; initialNodeType?: string } | null

function AutomationCanvasInner({ orgSlug, initialRule, initialPrompt, initialName, templateId, blank }: Props) {
  const router = useRouter()
  const { zoomIn, zoomOut, fitView, screenToFlowPosition, addNodes } = useReactFlow()
  const { token, currentOrg } = useAuthStore(useShallow(s => ({ token: s.token, currentOrg: s.currentOrg })))
  const { conversations, loadConversations } = useChatStore(useShallow(s => ({ conversations: s.conversations, loadConversations: s.loadConversations })))
  const { membersByOrgId, loadMembers, departmentsByOrgId, loadDepartments } = useWorkspaceStore(
    useShallow(s => ({ membersByOrgId: s.membersByOrgId, loadMembers: s.loadMembers, departmentsByOrgId: s.departmentsByOrgId, loadDepartments: s.loadDepartments }))
  )
  const members     = currentOrg ? (membersByOrgId[currentOrg.id] ?? []) : []
  const departments = currentOrg ? (departmentsByOrgId[currentOrg.id] ?? []) : []

  const { ruleName, saving, error, setRuleName, resetCanvas, save } = useAutomationCanvasStore(
    useShallow(s => ({ ruleName: s.ruleName, saving: s.saving, error: s.error, setRuleName: s.setRuleName, resetCanvas: s.resetCanvas, save: s.save }))
  )

  const initialGraph = useMemo(() => {
    if (initialRule) return ruleToGraph(initialRule)
    if (templateId) {
      const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId)
      if (template) {
        return {
          nodes: template.presetGraph.nodes.map((n, i) => ({
            id: n.id,
            type: n.type === 'trigger' ? 'triggerNode' : n.type === 'condition' ? 'conditionNode' : 'actionNode',
            position: { x: CANVAS_CENTER_X, y: 60 + i * (NODE_HEIGHT + STEP_GAP) },
            data: { nodeType: n.nodeType, config: n.config },
          })),
          edges: template.presetGraph.edges.map(e => ({
            id: e.id, source: e.source, target: e.target,
            sourceHandle: (e as { sourceHandle?: string }).sourceHandle,
            type: 'automationEdge',
          })),
        }
      }
    }
    return { nodes: [], edges: [] }
  }, [initialRule, templateId, blank])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)
  const [aiModalOpen, setAiModalOpen]     = useState(false)
  const [panelTarget, setPanelTarget]     = useState<PanelTarget>(null)
  const [isEditingName, setIsEditingName] = useState(false)

  useEffect(() => {
    if (initialRule) setRuleName(initialRule.name)
    else if (templateId) {
      const t = WORKFLOW_TEMPLATES.find(t => t.id === templateId)
      if (t) setRuleName(t.name)
    } else if (initialName) setRuleName(initialName)
    return () => { resetCanvas() }
  }, [initialRule, templateId, initialName, setRuleName, resetCanvas])

  useEffect(() => {
    if (initialPrompt && !initialRule && !templateId) setAiModalOpen(true)
  }, [initialPrompt, initialRule, templateId])

  useEffect(() => {
    if (token && conversations.length === 0) loadConversations(token).catch(() => undefined)
    if (token && currentOrg && members.length === 0) loadMembers(currentOrg.id, token).catch(() => undefined)
    if (token && currentOrg && departments.length === 0) loadDepartments(currentOrg.id, token).catch(() => undefined)
  }, [token, conversations.length, loadConversations, members.length, loadMembers, currentOrg])

  const channels = conversations
    .filter(c => c.type === 'PUBLIC_CHANNEL' || c.type === 'PRIVATE_CHANNEL')
    .map(c => ({ id: c.id, name: c.name ?? null }))

  const enrichedNodes = useMemo(() => nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      ...(n.type === 'actionNode'    ? { conversations: channels, members } : {}),
      ...(n.type === 'conditionNode' ? { conversations: channels } : {}),
    },
  })), [nodes, channels, members])

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge({ ...connection, type: 'automationEdge' }, eds)),
    [setEdges],
  )

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    const kind = node.type === 'triggerNode' ? 'trigger' : node.type === 'conditionNode' ? 'condition' : 'action'
    setPanelTarget({ nodeId: node.id, nodeKind: kind })
  }, [])

  // Drag-and-drop from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeKind = e.dataTransfer.getData('application/reactflow-kind') as 'trigger' | 'condition' | 'action'
    const nodeType = e.dataTransfer.getData('application/reactflow-type')
    if (!nodeKind) return

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const newId = `${nodeKind}-${Date.now()}`
    const rfType = nodeKind === 'trigger' ? 'triggerNode' : nodeKind === 'condition' ? 'conditionNode' : 'actionNode'

    addNodes([{ id: newId, type: rfType, position, data: { nodeType: nodeType || null, config: {} } }])
    setPanelTarget({ nodeId: newId, nodeKind, initialNodeType: nodeType || undefined })
  }, [screenToFlowPosition, addNodes])

  async function handleSave() {
    if (!token) return
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
    <div className="flex h-full flex-col bg-white">
      {/* Top bar */}
      <header className="flex min-h-[52px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button
          onClick={() => router.push(`/${orgSlug}/automation`)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          <span>Automations</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {isEditingName ? (
          <input
            autoFocus
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setIsEditingName(false) }}
            placeholder="Workflow name…"
            className="min-w-0 max-w-xs flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="min-w-0 max-w-xs truncate rounded px-2 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            {ruleName || <span className="font-normal text-slate-400">Untitled workflow</span>}
          </button>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Sparkles className="size-3.5 text-purple-500" />
            Generate with AI
          </button>
          <button
            disabled={saving || !ruleName.trim()}
            onClick={handleSave}
            className={cn(
              'flex h-8 min-w-[90px] items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white transition',
              saving || !ruleName.trim() ? 'cursor-not-allowed bg-slate-300' : 'bg-brand hover:bg-brand-hover',
            )}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Main layout: palette | canvas | config panel */}
      <div className="flex min-h-0 flex-1">
        <NodePalette />

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={enrichedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setPanelTarget(null)}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            defaultEdgeOptions={{ type: 'automationEdge' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          </ReactFlow>

          {/* Zoom controls */}
          <div className="absolute right-4 top-4 z-10 flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-md">
            <button onClick={() => zoomIn()} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <ZoomIn className="size-4" />
            </button>
            <button onClick={() => zoomOut()} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <ZoomOut className="size-4" />
            </button>
            <div className="my-0.5 h-px bg-slate-100" />
            <button onClick={() => fitView({ padding: 0.4 })} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Maximize2 className="size-4" />
            </button>
          </div>

          {/* Drop hint when canvas is empty */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white/80 px-6 py-4 text-sm text-slate-400">
                Drag a block from the sidebar to get started
              </p>
            </div>
          )}
        </div>

        {panelTarget && (
          <NodePanel
            nodeId={panelTarget.nodeId}
            nodeKind={panelTarget.nodeKind}
            initialNodeType={panelTarget.initialNodeType}
            onClose={() => setPanelTarget(null)}
            conversations={channels}
            members={members}
            departments={departments}
          />
        )}
      </div>

      <AiGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={handleAiGenerate}
        conversations={channels}
        members={members}
        initialPrompt={initialPrompt}
      />
    </div>
  )
}

export function AutomationCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <AutomationCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
