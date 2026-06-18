'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { AutomationCanvas } from '../canvas/automation-canvas'

export default function NewRulePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template') ?? undefined
  const prompt = searchParams.get('prompt') ?? undefined
  const name = searchParams.get('name') ?? undefined

  const blank = !templateId && !prompt

  return (
    <AutomationCanvas
      orgSlug={orgSlug}
      initialPrompt={prompt}
      initialName={name}
      templateId={templateId}
      blank={blank}
    />
  )
}
