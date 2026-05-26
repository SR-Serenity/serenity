import type { ReactNode } from 'react'
import { WikiInitializer } from './components/wiki-initializer'

export default function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WikiInitializer />
      {children}
    </>
  )
}
