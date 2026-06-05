'use client'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

export function AssistantContent({ content, pending }: { content: string; pending?: boolean }) {
  if (pending) {
    return (
      <span className="flex items-center gap-1.5 text-slate-400">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </span>
    )
  }

  return (
    <div className="prose prose-sm prose-slate max-w-none [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-1 [&_ol]:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  )
}
