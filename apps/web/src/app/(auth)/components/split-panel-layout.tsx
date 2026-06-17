import type { ReactNode } from 'react'

interface SplitPanelLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function SplitPanelLayout({ left, right }: SplitPanelLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 [color-scheme:light] [--highlight-hover:#f8fafc] [--theme-bg-color:#ffffff] [--theme-button-border:#cbd5e1] [--theme-button-default:#f8fafc] [--theme-caption-color:#0f172a] [--theme-content-color:#0f172a] [--theme-divider-color:#e2e8f0] [--theme-darker-color:#64748b] [--theme-list-row-color:#ffffff] [--theme-panel-color:#ffffff]">
      {/* Left panel — dark branded side, hidden on mobile */}
      <div className="relative hidden shrink-0 overflow-hidden lg:flex lg:w-[460px] lg:flex-col lg:justify-between xl:w-[540px]">
        <div className="absolute inset-0 bg-slate-900" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          {left}
        </div>
      </div>

      {/* Right panel — form side */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          {right}
        </div>
      </div>
    </div>
  )
}
