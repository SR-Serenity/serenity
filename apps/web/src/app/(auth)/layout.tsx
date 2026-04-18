import type { ReactNode } from 'react'
import { SplitPanelLayout } from '@/components/layouts/split-panel-layout'
import { AuthHeroPanel } from '@/components/auth/auth-hero-panel'
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SplitPanelLayout
      left={<AuthHeroPanel />}
      right={<AuthFormWrapper>{children}</AuthFormWrapper>}
    />
  )
}
