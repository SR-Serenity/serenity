import type { Node, Edge } from '@xyflow/react'
import type { AutomationRule } from '@serenity/api'

export function ruleToGraph(rule: AutomationRule): { nodes: Node[]; edges: Edge[] } {
  if (rule.stepsGraph) {
    const nodes: Node[] = rule.stepsGraph.nodes.map(n => ({
      id: n.id,
      type: n.type === 'trigger' ? 'triggerNode' : n.type === 'condition' ? 'conditionNode' : 'actionNode',
      position: n.position,
      data: { nodeType: n.nodeType, config: n.config },
    }))
    const edges: Edge[] = rule.stepsGraph.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      type: 'automationEdge',
    }))
    return { nodes, edges }
  }

  // Synthesize a 2-node graph from flat fields for legacy rules
  const triggerId = 'trigger-1'
  const actionId = 'action-1'

  const nodes: Node[] = [
    {
      id: triggerId,
      type: 'triggerNode',
      position: { x: 250, y: 80 },
      data: { nodeType: rule.triggerType, config: rule.triggerConfig },
    },
    {
      id: actionId,
      type: 'actionNode',
      position: { x: 250, y: 280 },
      data: { nodeType: rule.actionType, config: rule.actionConfig },
    },
  ]

  const edges: Edge[] = [
    { id: `e-${triggerId}-${actionId}`, source: triggerId, target: actionId, type: 'automationEdge' },
  ]

  return { nodes, edges }
}
