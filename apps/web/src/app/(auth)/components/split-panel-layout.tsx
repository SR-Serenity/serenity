import type { ReactNode } from 'react'

interface SplitPanelLayoutProps {
  left: ReactNode
  right: ReactNode
}

/**
 * Reusable split-panel layout for auth flows
 * Left: branding/hero (hidden on mobile)
 * Right: form/content (full width on mobile)
 */
export function SplitPanelLayout({
  left,
  right,
}: SplitPanelLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white text-slate-900 [color-scheme:light] [--highlight-hover:#f8fafc] [--theme-bg-color:#ffffff] [--theme-button-border:#cbd5e1] [--theme-button-default:#f8fafc] [--theme-caption-color:#0f172a] [--theme-content-color:#0f172a] [--theme-divider-color:#e2e8f0] [--theme-darker-color:#64748b] [--theme-list-row-color:#ffffff] [--theme-panel-color:#ffffff]">
      {/* Left panel - hidden on mobile */}
      <div className="relative hidden shrink-0 overflow-hidden border-r border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] p-12 text-[var(--theme-caption-color)] lg:flex lg:w-[480px] lg:flex-col lg:justify-between xl:w-[560px]">
        {left}
      </div>

      {/* Right panel - form/content */}
      <div className="flex flex-1 items-center justify-center bg-[var(--theme-bg-color)] p-6">
        <div className="w-full max-w-[430px] rounded-xl border border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] p-6 shadow-sm sm:p-8">
          {right}
        </div>
      </div>
    </div>
  )
}
