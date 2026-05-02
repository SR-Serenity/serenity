interface BlankWorkspacePageProps {
  title: string
}

export function BlankWorkspacePage({ title }: BlankWorkspacePageProps) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-brand-surface/50 px-6">
      <div className="text-center max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
          Coming soon
        </p>
        <h1 className="text-2xl font-semibold text-brand mt-3">{title}</h1>
        <p className="text-base text-brand-muted mt-2 leading-relaxed">
          This section is under construction.
        </p>
      </div>
    </div>
  )
}
