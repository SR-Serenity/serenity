import type { ReactNode } from 'react'
import { OfficeInitializer } from './components/office-initializer'

export default function OfficeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OfficeInitializer />
      {children}
    </>
  )
}
