import type { ReactNode } from 'react'
import { SplitPanelLayout } from '@/app/(auth)/components/split-panel-layout'
import { AuthHeroPanel } from '@/app/(auth)/components/auth-hero-panel'
import { AuthFormWrapper } from '@/app/(auth)/components/auth-form-wrapper'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SplitPanelLayout
      left={<AuthHeroPanel />}
      right={<AuthFormWrapper>{children}</AuthFormWrapper>}
    />
  )
}
