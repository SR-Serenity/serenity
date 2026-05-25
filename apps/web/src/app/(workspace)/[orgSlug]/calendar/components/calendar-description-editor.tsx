interface CalendarDescriptionEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CalendarDescriptionEditor({
  value,
  onChange,
}: CalendarDescriptionEditorProps) {
  return (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder="Add notes, agenda, or details"
      className="min-h-52 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
    />
  )
}
