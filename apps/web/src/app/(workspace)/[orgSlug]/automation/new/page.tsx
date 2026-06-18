'use client'

import { useParams } from 'next/navigation'
import { AutomationCanvas } from '../canvas/automation-canvas'

export default function NewRulePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  return <AutomationCanvas orgSlug={orgSlug} />
}
