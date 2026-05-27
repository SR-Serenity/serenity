'use client'

import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

export default function InboxRedirectPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    router.replace(`/${params.orgSlug}/copilot${query ? `?${query}` : ''}`)
  }, [params.orgSlug, router, searchParams])

  return null
}
