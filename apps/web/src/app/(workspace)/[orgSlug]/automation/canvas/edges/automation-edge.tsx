'use client'

import { EdgeLabelRenderer, getStraightPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'

export function AutomationEdge({
  id, sourceX, sourceY, targetX, targetY, sourceHandleId,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  const isTrueBranch  = sourceHandleId === 'true'
  const isFalseBranch = sourceHandleId === 'false'
  const isBranch      = isTrueBranch || isFalseBranch

  const strokeColor = isTrueBranch ? '#22c55e' : isFalseBranch ? '#f87171' : '#cbd5e1'
  const strokeDash  = isBranch ? '6 3' : '0'

  return (
    <>
      <path
        id={id}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        strokeDasharray={strokeDash}
      />

      {isBranch && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY + 16}px)` }}
            className="pointer-events-none absolute"
          >
            <span className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
              isTrueBranch ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
            )}>
              {isTrueBranch ? '✓ Yes' : '✗ No'}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
