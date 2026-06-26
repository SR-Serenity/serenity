'use client'

import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import { automationApi } from '@serenity/api'
import type { StepsGraph } from '@serenity/api'
import { browserTimezone } from '@/lib/time'

type CanvasState = {
  nodes: Node[]
  edges: Edge[]
  ruleName: string
  saving: boolean
  error: string | null
}

type CanvasActions = {
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setRuleName: (name: string) => void
  resetCanvas: () => void
  loadFromGraph: (name: string, graph: StepsGraph) => void
  save: (token: string, ruleId?: string) => Promise<string | null>
}

const DEFAULT_STATE: CanvasState = {
  nodes: [],
  edges: [],
  ruleName: '',
  saving: false,
  error: null,
}

function withTimeZone(nodeType: string, config: Record<string, unknown>): Record<string, unknown> {
  if (nodeType !== 'SCHEDULE' && nodeType !== 'TIME_WINDOW') {
    return config
  }
  return {
    ...config,
    timeZone: (config.timeZone as string | undefined) ?? browserTimezone(),
  }
}

export const useAutomationCanvasStore = create<CanvasState & CanvasActions>()((set, get) => ({
  ...DEFAULT_STATE,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setRuleName: (ruleName) => set({ ruleName }),

  resetCanvas: () => set({ ...DEFAULT_STATE }),

  loadFromGraph: (name, graph) => {
    const nodes: Node[] = graph.nodes.map(n => ({
      id: n.id,
      type: n.type === 'trigger' ? 'triggerNode' : n.type === 'condition' ? 'conditionNode' : 'actionNode',
      position: n.position,
      data: { nodeType: n.nodeType, config: n.config },
    }))
    const edges: Edge[] = graph.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      type: 'automationEdge',
    }))
    set({ ruleName: name, nodes, edges })
  },

  save: async (token, ruleId) => {
    const { nodes, edges, ruleName } = get()
    set({ saving: true, error: null })

    const triggerNode = nodes.find(n => n.type === 'triggerNode')
    if (!triggerNode) {
      set({ saving: false, error: 'Add a trigger node to start your workflow.' })
      return null
    }
    if (!ruleName.trim()) {
      set({ saving: false, error: 'Give your rule a name.' })
      return null
    }

    const graphNodes: StepsGraph['nodes'] = nodes.map(n => {
      const nodeType = (n.data as { nodeType: string }).nodeType as StepsGraph['nodes'][0]['nodeType']
      const config = (n.data as { config: Record<string, unknown> }).config ?? {}
      return {
        id: n.id,
        type: n.type === 'triggerNode' ? 'trigger' : n.type === 'conditionNode' ? 'condition' : 'action',
        nodeType,
        config: withTimeZone(String(nodeType), config),
        position: n.position,
      }
    })

    const stepsGraph: StepsGraph = {
      nodes: graphNodes,
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle as 'true' | 'false' | undefined,
      })),
    }

    const triggerGraphNode = graphNodes.find(n => n.id === triggerNode.id)
    const firstActionNode = nodes.find(n => n.type === 'actionNode')
    const actionData = firstActionNode?.data as { nodeType: string; config: Record<string, unknown> } | undefined

    const input = {
      name: ruleName.trim(),
      triggerType: triggerGraphNode?.nodeType as Parameters<typeof automationApi.createRule>[1]['triggerType'],
      triggerConfig: triggerGraphNode?.config ?? {},
      actionType: (actionData?.nodeType ?? 'AI_AGENT') as Parameters<typeof automationApi.createRule>[1]['actionType'],
      actionConfig: actionData?.config ?? {},
      stepsGraph,
    }

    try {
      const rule = ruleId
        ? await automationApi.updateRule(token, ruleId, input)
        : await automationApi.createRule(token, input)
      set({ saving: false })
      return rule.id
    } catch (err) {
      set({ saving: false, error: err instanceof Error ? err.message : 'Failed to save rule' })
      return null
    }
  },
}))
