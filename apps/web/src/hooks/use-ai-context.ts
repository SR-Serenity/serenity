import { useWikiStore } from '@/stores/wiki-store'
import type { AiRequestContext } from '@serenity/api'

export type AiContextResult = {
  contextLabel: string | null
  requestContext: AiRequestContext
}

export function useAiContext(): AiContextResult {
  const selectedPage = useWikiStore(state => state.selectedPage)

  if (selectedPage) {
    return {
      contextLabel: selectedPage.title || 'Untitled page',
      requestContext: { wikiPageId: selectedPage.id },
    }
  }

  return { contextLabel: null, requestContext: {} }
}
