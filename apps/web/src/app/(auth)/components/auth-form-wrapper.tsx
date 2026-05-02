import type { ReactNode } from 'react'

interface AuthFormWrapperProps {
  children: ReactNode
}

/**
 * Auth right panel: form wrapper with mobile logo
 * Container for login/register/org-picker forms
 */
export function AuthFormWrapper({ children }: AuthFormWrapperProps) {
  return (
    <div className="w-full">
      {/* Mobile logo - visible only on mobile */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-base font-semibold text-brand">Serenity</span>
      </div>

      {/* Form content */}
      {children}
    </div>
  )
}
