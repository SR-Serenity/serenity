'use client'

import type { ReactNode } from 'react'

type ChatLayoutProps = {
  children: ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="h-full min-w-0">
      {children}
    </div>
  )
}
