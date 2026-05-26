'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useCreateBlockNote } from '@blocknote/react'

export type WikiBlockContent = PartialBlock[]

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
}: {
  content: unknown
  markdownFallback: string
  editable: boolean
  onChange: (blocks: WikiBlockContent, plainText: string) => void
}) {
  const initialContent = useMemo(
    () => normalizeBlocks(content, markdownFallback),
    [content, markdownFallback],
  )
  const editor = useCreateBlockNote({ initialContent })
  const lastPageContent = useRef(content)

  useEffect(() => {
    if (lastPageContent.current === content) return
    lastPageContent.current = content
    editor.replaceBlocks(editor.document, normalizeBlocks(content, markdownFallback))
  }, [content, editor, markdownFallback])

  return (
    <div className="serenity-notion-editor">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={() => {
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
      />
    </div>
  )
}
