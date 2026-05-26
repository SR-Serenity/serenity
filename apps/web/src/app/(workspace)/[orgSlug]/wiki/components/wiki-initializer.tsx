'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWikiStore } from '@/stores/wiki-store'

export function WikiInitializer() {
  const params = useParams<{ orgSlug: string; pageId?: string }>()
  const router = useRouter()
  const routePageId = Array.isArray(params.pageId) ? params.pageId[0] : params.pageId

  const { token, orgId } = useAuthStore(
    useShallow(state => ({ token: state.token, orgId: state.currentOrg?.id })),
  )
  const { loadDepartments } = useWorkspaceStore(
    useShallow(state => ({ loadDepartments: state.loadDepartments })),
  )
  const { loadPages, reset } = useWikiStore(
    useShallow(state => ({ loadPages: state.loadPages, reset: state.reset })),
  )

  useEffect(() => {
    return () => reset()
  }, [reset])

  useEffect(() => {
    if (!token) return
    void loadDepartments(orgId, token)
  }, [loadDepartments, orgId, token])

  useEffect(() => {
    if (!token) return
    void loadPages(token, params.orgSlug, routePageId, path => router.replace(path))
  }, [token, params.orgSlug, routePageId, loadPages, router])

  return null
}
