interface WorkspaceHeaderProps {
  title: string
  subtitle?: string
}

/**
 * Workspace page header: title and optional subtitle
 * Appears above main content
 */
export function WorkspaceHeader({ title, subtitle }: WorkspaceHeaderProps) {
  return (
    <div className="px-8 py-5 border-b border-brand-border bg-white">
      <h1 className="text-base font-semibold text-brand">{title}</h1>
      {subtitle && <p className="text-sm text-brand-muted mt-1">{subtitle}</p>}
    </div>
  )
}
