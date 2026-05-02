interface AvatarPillProps {
  initials: string
}

const avatarGradientColors = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-violet-500 to-violet-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
]

export function AvatarPill({ initials }: AvatarPillProps) {
  const safeInitials = initials || 'NA'
  const color = avatarGradientColors[safeInitials.charCodeAt(0) % avatarGradientColors.length]

  return (
    <div
      className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} text-white text-xs font-bold
      flex items-center justify-center shrink-0`}
    >
      {safeInitials}
    </div>
  )
}
