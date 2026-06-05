'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Block, PartialBlock } from '@blocknote/core'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { createReactBlockSpec } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { Check, FileText, Sparkles, X } from 'lucide-react'
import { WikiAiCommandBar } from './wiki-ai-command-bar'

// ── Sub-page block ────────────────────────────────────────────────────────────

function SubPageBlockView({ block }: { block: { props: { pageId: string; title: string; url: string } } }) {
  const router = useRouter()
  return (
    <div
      contentEditable={false}
      onClick={() => block.props.url && router.push(block.props.url)}
      className="group flex w-full cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[#f1f1ef]"
    >
      <FileText className="h-[1.1em] w-[1.1em] flex-shrink-0 text-[#9b9a97]" />
      <span className="text-[inherit] underline decoration-[#9b9a97] underline-offset-2 group-hover:decoration-[#37352f]">
        {block.props.title || 'Untitled'}
      </span>
    </div>
  )
}

const SubPageBlock = createReactBlockSpec(
  {
    type: 'subPage' as const,
    propSchema: {
      pageId: { default: '' },
      title: { default: 'Untitled' },
      url: { default: '' },
    },
    content: 'none',
  },
  { render: ({ block }) => <SubPageBlockView block={block} /> },
)

const customSchema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, subPage: SubPageBlock() },
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type WikiBlockContent = PartialBlock[]
export type WikiPageRef = { id: string; title: string; url: string }

export type AiCommandBarContext = {
  token: string
  pageId: string
  pageTitle: string
  authContext: {
    orgId: string
    userId: string
    role?: string | null
    displayName?: string | null
    email?: string | null
    orgName?: string | null
    orgSlug?: string | null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyBlocks: WikiBlockContent = [{ type: 'paragraph', content: '' }]

export function fallbackBlocks(markdown: string): WikiBlockContent {
  const lines = markdown.split('\n').filter(line => line.trim().length > 0)
  if (lines.length === 0) return emptyBlocks
  return lines.map(line => {
    const t = line.trim()
    if (t.startsWith('- [x]') || t.startsWith('- [ ]'))
      return { type: 'checkListItem', props: { checked: t.startsWith('- [x]') }, content: t.replace(/^- \[[ x]\]\s*/, '') }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const cleanContent = t.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')
      return { type: 'bulletListItem', content: cleanContent }
    }
    if (t.startsWith('### '))
      return { type: 'heading', props: { level: 3 }, content: t.replace(/^###\s*/, '') }
    if (t.startsWith('## '))
      return { type: 'heading', props: { level: 2 }, content: t.replace(/^##\s*/, '') }
    if (t.startsWith('# '))
      return { type: 'heading', props: { level: 1 }, content: t.replace(/^#\s*/, '') }
    if (t.startsWith('> '))
      return { type: 'quote', content: t.replace(/^>\s*/, '') }
    return { type: 'paragraph', content: t }
  }) as WikiBlockContent
}

function normalizeBlocks(content: unknown, markdown: string): WikiBlockContent {
  if (Array.isArray(content) && content.length > 0) return content as WikiBlockContent
  return fallbackBlocks(markdown)
}

function blocksToText(blocks: Block[] | WikiBlockContent): string {
  return (blocks as WikiBlockContent)
    .map(block => {
      const c = block.content
      if (typeof c === 'string') return c
      if (Array.isArray(c))
        return c.map(item => (typeof item === 'object' && item && 'text' in item ? String(item.text) : '')).join('')
      return ''
    })
    .join('\n')
}

// ── Accept / Discard banner ───────────────────────────────────────────────────

function AiAcceptBar({
  explanation,
  onAccept,
  onDiscard,
}: {
  explanation: string
  onAccept: () => void
  onDiscard: () => void
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-lg border-b border-violet-200 bg-violet-50 px-4 py-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
        <Sparkles className="h-3 w-3 text-violet-600" />
      </span>
      <p className="min-w-0 flex-1 truncate text-xs text-violet-700">{explanation}</p>
      <button
        type="button"
        onClick={onAccept}
        className="flex h-6 items-center gap-1 rounded-md bg-[#37352f] px-2.5 text-xs font-medium text-white hover:bg-[#2f2d28]"
      >
        <Check className="h-3 w-3" />
        Accept
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="flex h-6 items-center gap-1 rounded-md border border-[#e3e2e0] bg-white px-2.5 text-xs font-medium text-[#787774] hover:bg-[#f1f1ef]"
      >
        <X className="h-3 w-3" />
        Discard
      </button>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────

export function NotionBlockEditor({
  content,
  markdownFallback,
  editable,
  onChange,
  onCreateSubPage,
  pages = [],
  aiContext,
}: {
  content: unknown
  markdownFallback: string
  editable: boolean
  onChange: (blocks: WikiBlockContent, plainText: string) => void
  onCreateSubPage?: () => Promise<{ id: string; title: string; url: string } | null>
  pages?: WikiPageRef[]
  aiContext?: AiCommandBarContext
}) {
  const initialContent = useMemo(
    () => normalizeBlocks(content, markdownFallback),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const editor = useCreateBlockNote({
    schema: customSchema,
    initialContent,
    domAttributes: {
      editor: {
        spellcheck: 'false',
      },
    },
  })
  const lastPageContent = useRef(content)
  const isProgrammaticUpdate = useRef(false)

  // AI state
  const [aiBarOpen, setAiBarOpen] = useState(false)
  const [currentMarkdown, setCurrentMarkdown] = useState(markdownFallback)
  const [aiPending, setAiPending] = useState<{
    originalBlocks: Block[]
    explanation: string
  } | null>(null)

  // ── Sync external content changes ─────────────────────────────────────────
  useEffect(() => {
    if (lastPageContent.current === content) return
    lastPageContent.current = content
    isProgrammaticUpdate.current = true
    editor.replaceBlocks(editor.document, normalizeBlocks(content, markdownFallback))
  }, [content, editor, markdownFallback])

  // ── Sub-page ───────────────────────────────────────────────────────────────
  const handleCreateSubPage = useCallback(async () => {
    if (!onCreateSubPage) return
    const result = await onCreateSubPage()
    if (!result) return
    const cursor = editor.getTextCursorPosition()
    editor.insertBlocks(
      [{ type: 'subPage' as const, props: { pageId: result.id, title: result.title || 'Untitled', url: result.url } }],
      cursor.block,
      'after',
    )
  }, [editor, onCreateSubPage])

  // ── Slash menu ─────────────────────────────────────────────────────────────
  const slashMenuItems = useMemo(() => {
    const defaultItems = getDefaultReactSlashMenuItems(editor)
    const extra = []
    if (editable && aiContext) {
      extra.push({
        key: 'ask-ai',
        group: 'AI',
        title: 'Ask AI',
        aliases: ['ai', 'assistant', 'edit', 'generate', 'write', 'rewrite', 'suggest'],
        icon: <Sparkles className="h-4 w-4 text-violet-500" />,
        onItemClick: async () => {
          const md = await editor.blocksToMarkdownLossy(editor.document)
          setCurrentMarkdown(md)
          setAiBarOpen(true)
        },
      })
    }
    if (editable && onCreateSubPage) {
      extra.push({
        key: 'sub-page',
        group: 'Pages',
        title: 'Sub-page',
        aliases: ['subpage', 'page', 'child'],
        icon: <FileText className="h-4 w-4" />,
        onItemClick: () => { void handleCreateSubPage() },
      })
    }
    return [...extra, ...defaultItems]
  }, [editable, editor, handleCreateSubPage, onCreateSubPage, aiContext])

  const getSlashMenuItems = useCallback(async (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return slashMenuItems
    return slashMenuItems.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true
      return (item.aliases ?? []).some(a => a.toLowerCase().includes(q))
    })
  }, [slashMenuItems])

  const getPageMentionItems = useCallback(async (query: string) => {
    const q = query.trim().toLowerCase()
    const filtered = q ? pages.filter(p => (p.title || '').toLowerCase().includes(q)) : pages
    return filtered.slice(0, 8).map(page => ({
      key: page.id,
      group: 'Pages',
      title: page.title || 'Untitled',
      aliases: [],
      icon: <FileText className="h-4 w-4" />,
      onItemClick: () => {
        editor.insertInlineContent([
          { type: 'link', href: page.url, content: [{ type: 'text', text: page.title || 'Untitled', styles: {} }] },
          { type: 'text', text: ' ', styles: {} },
        ])
      },
    }))
  }, [editor, pages])

  // ── AI preview: apply to editor, store originals for revert ───────────────
  const handleAiPreview = useCallback(async (updatedMarkdown: string, explanation: string) => {
    const originalBlocks = editor.document as Block[]
    isProgrammaticUpdate.current = true
    const newBlocks = await editor.tryParseMarkdownToBlocks(updatedMarkdown)
    editor.replaceBlocks(editor.document, newBlocks)
    setAiPending({ originalBlocks, explanation })
    setAiBarOpen(false)
  }, [editor])

  // ── Accept: commit the previewed content ───────────────────────────────────
  const handleAiAccept = useCallback(() => {
    const blocks = editor.document as WikiBlockContent
    onChange(blocks, blocksToText(blocks))
    setAiPending(null)
  }, [editor, onChange])

  // ── Discard: revert to original blocks ────────────────────────────────────
  const handleAiDiscard = useCallback(() => {
    if (!aiPending) return
    isProgrammaticUpdate.current = true
    editor.replaceBlocks(editor.document, aiPending.originalBlocks)
    setAiPending(null)
  }, [editor, aiPending])

  // ── Editor onChange ────────────────────────────────────────────────────────
  const handleEditorChange = useCallback(() => {
    if (isProgrammaticUpdate.current) {
      isProgrammaticUpdate.current = false
      return
    }
    // If there's a pending AI change, user edited manually → discard pending
    if (aiPending) setAiPending(null)

    const blocks = editor.document as WikiBlockContent
    onChange(blocks, blocksToText(blocks))
  }, [editor, onChange, aiPending])

  return (
    <div className="relative flex flex-col pb-[30vh]">
      {/* Accept / Discard strip */}
      {aiPending && (
        <AiAcceptBar
          explanation={aiPending.explanation}
          onAccept={handleAiAccept}
          onDiscard={handleAiDiscard}
        />
      )}

      {/* BlockNote editor */}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        slashMenu={false}
        onChange={handleEditorChange}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
          onItemClick={item => item.onItemClick()}
          floatingUIOptions={{ useFloatingOptions: { placement: 'top-start' } }}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={getPageMentionItems}
          onItemClick={item => item.onItemClick()}
          floatingUIOptions={{ useFloatingOptions: { placement: 'top-start' } }}
        />
      </BlockNoteView>

      {/* Inline AI prompt bar — no modal, no backdrop */}
      {aiContext && (
        <WikiAiCommandBar
          open={aiBarOpen}
          token={aiContext.token}
          pageId={aiContext.pageId}
          pageTitle={aiContext.pageTitle}
          pageContentMarkdown={currentMarkdown}
          authContext={aiContext.authContext}
          onPreview={handleAiPreview}
          onClose={() => setAiBarOpen(false)}
        />
      )}
    </div>
  )
}
