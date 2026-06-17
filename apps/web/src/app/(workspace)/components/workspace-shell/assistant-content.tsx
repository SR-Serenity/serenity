'use client'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

const markdownClass =
  'prose prose-sm prose-slate max-w-none min-w-0 overflow-hidden break-words [&_*]:max-w-full [&_a]:break-all [&_code]:break-words [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_ol]:my-1 [&_p:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre_code]:break-normal [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:my-1'

export function AssistantContent({ content, pending }: { content: string; pending?: boolean }) {
  // Nothing received yet — show typing indicator
  if (pending && !content) {
    return (
      <span className="flex items-center gap-1.5 text-slate-400">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </span>
    )
  }

  // Streaming in progress — render plain text to avoid markdown parser glitches
  // on partial tokens (e.g. incomplete `**bold**`, dangling `#` heading markers).
  if (pending && content) {
    return (
      <span className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {content}
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-sm bg-current align-text-bottom opacity-70" />
      </span>
    )
  }

  // Fully received — render formatted markdown
  return (
    <div className={markdownClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  )
}
