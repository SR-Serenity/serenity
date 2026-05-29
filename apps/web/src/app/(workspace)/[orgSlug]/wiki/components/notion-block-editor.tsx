'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { createReactBlockSpec } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { FileText } from 'lucide-react'

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

export type WikiBlockContent = PartialBlock[]

export type WikiPageRef = { id: string; title: string; url: string }

const emptyBlocks: WikiBlockContent = [
  {
    type: 'paragraph',
    content: '',
  },
]

export function fallbackBlocks(markdown: string): WikiBlockContent {
  const lines = markdown.split('\n').filter(line => line.trim().length > 0)
  if (lines.length === 0) return emptyBlocks

  return lines.map(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [ ]')) {
      return {
        type: 'checkListItem',
        props: { checked: trimmed.startsWith('- [x]') },
        content: trimmed.replace(/^- \[[ x]\]\s*/, ''),
      }
    }
    if (trimmed.startsWith('# ')) {
      return {
        type: 'heading',
        props: { level: 1 },
        content: trimmed.replace(/^#\s*/, ''),
      }
    }
    if (trimmed.startsWith('> ')) {
      return {
        type: 'quote',
        content: trimmed.replace(/^>\s*/, ''),
      }
    }
    return {
      type: 'paragraph',
      content: trimmed,
    }
  }) as WikiBlockContent
}

function normalizeBlocks(content: unknown, markdown: string): WikiBlockContent {
  if (Array.isArray(content) && content.length > 0) {
    return content as WikiBlockContent
  }
  return fallbackBlocks(markdown)
}

export function NotionBlockEditor({
  content,
  markdownFallback,
  editable,
  onChange,
  onCreateSubPage,
  pages = [],
}: {
  content: unknown
  markdownFallback: string
  editable: boolean
  onChange: (blocks: WikiBlockContent, plainText: string) => void
  onCreateSubPage?: () => Promise<{ id: string; title: string; url: string } | null>
  pages?: WikiPageRef[]
}) {
  const initialContent = useMemo(
    () => normalizeBlocks(content, markdownFallback),
    [content, markdownFallback],
  )
  const editor = useCreateBlockNote({ schema: customSchema, initialContent })
  const lastPageContent = useRef(content)
  const isProgrammaticUpdate = useRef(false)

  const handleCreateSubPage = useCallback(async () => {
    if (!onCreateSubPage) return
    const result = await onCreateSubPage()
    if (!result) return

    const cursorPosition = editor.getTextCursorPosition()
    const subPageBlock = {
      type: 'subPage' as const,
      props: { pageId: result.id, title: result.title || 'Untitled', url: result.url },
    }
    editor.insertBlocks([subPageBlock], cursorPosition.block, 'after')
  }, [editor, onCreateSubPage])

  const slashMenuItems = useMemo(() => {
    const defaultItems = getDefaultReactSlashMenuItems(editor)
    if (!editable || !onCreateSubPage) return defaultItems
    const subPageItem = {
      key: 'sub-page',
      group: 'Pages',
      title: 'Sub-page',
      aliases: ['subpage', 'page', 'child', 'sub-page'],
      icon: <FileText className="h-4 w-4" />,
      onItemClick: () => {
        void handleCreateSubPage()
      },
    }
    return [subPageItem, ...defaultItems]
  }, [editable, editor, handleCreateSubPage, onCreateSubPage])

  const getSlashMenuItems = useCallback(async (query: string) => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return slashMenuItems
    return slashMenuItems.filter(item => {
      const title = item.title.toLowerCase()
      if (title.includes(normalized)) return true
      return (item.aliases ?? []).some(alias => alias.toLowerCase().includes(normalized))
    })
  }, [slashMenuItems])

  const getPageMentionItems = useCallback(async (query: string) => {
    const normalized = query.trim().toLowerCase()
    const filtered = normalized
      ? pages.filter(p => (p.title || 'Untitled').toLowerCase().includes(normalized))
      : pages
    return filtered.slice(0, 8).map(page => ({
      key: page.id,
      group: 'Pages',
      title: page.title || 'Untitled',
      aliases: [],
      icon: <FileText className="h-4 w-4" />,
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: 'link',
            href: page.url,
            content: [{ type: 'text', text: page.title || 'Untitled', styles: {} }],
          },
          { type: 'text', text: ' ', styles: {} },
        ])
      },
    }))
  }, [editor, pages])

  useEffect(() => {
    if (lastPageContent.current === content) return
    lastPageContent.current = content
    isProgrammaticUpdate.current = true
    editor.replaceBlocks(editor.document, normalizeBlocks(content, markdownFallback))
  }, [content, editor, markdownFallback])

  return (
    <div className="serenity-notion-editor">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        slashMenu={false}
        onChange={() => {
          if (isProgrammaticUpdate.current) {
            isProgrammaticUpdate.current = false
            return
          }
          const blocks = editor.document as WikiBlockContent
          const text = blocks
            .map(block => {
              const contentValue = block.content
              if (typeof contentValue === 'string') return contentValue
              if (Array.isArray(contentValue)) {
                return contentValue
                  .map(item => typeof item === 'object' && item && 'text' in item ? String(item.text) : '')
                  .join('')
              }
              return ''
            })
            .join('\n')
          onChange(blocks, text)
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
          onItemClick={item => item.onItemClick()}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={getPageMentionItems}
          onItemClick={item => item.onItemClick()}
        />
      </BlockNoteView>
    </div>
  )
}
