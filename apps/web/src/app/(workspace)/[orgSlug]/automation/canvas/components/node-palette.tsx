'use client'

import { BLOCK_SECTIONS } from './block-registry'
import type { BlockDef } from './block-registry'

export function NodePalette() {
  function onDragStart(e: React.DragEvent, item: BlockDef) {
    e.dataTransfer.setData('application/reactflow-kind', item.nodeKind)
    e.dataTransfer.setData('application/reactflow-type', item.nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex-1 text-[13px] font-semibold text-slate-800">Blocks</span>
        <span className="text-[10px] text-slate-400">drag to canvas</span>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {BLOCK_SECTIONS.map(section => (
          <div key={section.title} className="px-3 py-3">
            {/* Section label */}
            <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${section.accentText}`}>
              {section.title}
            </p>

            {/* Items */}
            <div className="space-y-1.5">
              {section.items.map(item => (
                <div
                  key={item.nodeType}
                  draggable
                  onDragStart={e => onDragStart(e, item)}
                  className="flex cursor-grab items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm active:cursor-grabbing active:opacity-60"
                >
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-white ${item.iconBg}`}>
                    <item.Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-slate-800">{item.label}</p>
                    <p className="truncate text-[10px] text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-slate-400">
          Drag a block onto the canvas, then connect nodes by pulling from a handle.
        </p>
      </div>
    </aside>
  )
}
