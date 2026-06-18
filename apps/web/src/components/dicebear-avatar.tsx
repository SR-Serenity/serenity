import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const DICEBEAR_API_BASE = 'https://api.dicebear.com/10.x'
const DICEBEAR_STYLE = 'toon-head'
const DICEBEAR_BACKGROUND_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf']

function colorForSeed(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return DICEBEAR_BACKGROUND_COLORS[Math.abs(hash) % DICEBEAR_BACKGROUND_COLORS.length]
}

export function diceBearAvatarUrl(seed: string | null | undefined) {
  const normalizedSeed = seed?.trim() || 'serenity-member'
  const params = new URLSearchParams({
    seed: normalizedSeed,
    backgroundColor: colorForSeed(normalizedSeed),
  })

  return `${DICEBEAR_API_BASE}/${DICEBEAR_STYLE}/svg?${params.toString()}`
}

type DiceBearAvatarProps = {
  seed?: string | null
  name?: string | null
  alt?: string
  className?: string
  imageClassName?: string
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading']
}

export function DiceBearAvatar({
  seed,
  name,
  alt,
  className,
  imageClassName,
  loading = 'lazy',
}: DiceBearAvatarProps) {
  const avatarSeed = seed || name || 'serenity-member'

  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar', className)}>
      <img
        src={diceBearAvatarUrl(avatarSeed)}
        alt={alt ?? (name ? `${name} avatar` : 'Avatar')}
        className={cn('h-full w-full object-cover', imageClassName)}
        loading={loading}
        referrerPolicy="no-referrer"
        draggable={false}
      />
    </span>
  )
}
