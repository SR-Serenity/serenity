'use client'

import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'

export function AutomationEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
}: EdgeProps) {
  const { addNodes, addEdges, deleteElements, getNode } = useReactFlow()

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  function handleAddNode() {
    const newNodeId = `action-${Date.now()}`
    const sourceNode = getNode(id.split('->')[0])
    const midY = (sourceY + targetY) / 2

    addNodes([{
      id: newNodeId,
      type: 'actionNode',
      position: { x: (sourceX + targetX) / 2 - 128, y: midY - 60 },
      data: { nodeType: 'AI_AGENT', config: {} },
    }])

    deleteElements({ edges: [{ id }] })

    const sourceId = id.split('->')[0] ?? sourceNode?.id ?? ''
    const targetId = id.split('->')[1] ?? ''

    addEdges([
      { id: `${sourceId}->${newNodeId}`, source: sourceId, target: newNodeId, type: 'automationEdge' },
      { id: `${newNodeId}->${targetId}`, source: newNodeId, target: targetId, type: 'automationEdge' },
    ])
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#cbd5e1', strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="pointer-events-auto absolute"
        >
          <button
            onClick={handleAddNode}
            className="flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-blue-400 hover:text-blue-600"
          >
            <Plus className="size-3.5 text-slate-400" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
