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
    <div className="min-h-screen flex">
      {/* Left panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 bg-brand text-white shrink-0 relative overflow-hidden">
        {left}
      </div>

      {/* Right panel - form/content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-brand-surface">
        <div className="w-full max-w-[420px]">
          {right}
        </div>
      </div>
    </div>
  )
}
