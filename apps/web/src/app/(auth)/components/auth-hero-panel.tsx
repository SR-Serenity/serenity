import Image from 'next/image'
import { teamImages } from '@/lib/team-images'

/**
 * Auth left panel: branding + hero imagery
 * Reusable, scales with new features/messaging
 */
export function AuthHeroPanel() {
  return (
    <>
      {/* Background image layer */}
      <div className="absolute inset-0 opacity-10">
        <Image
          src={teamImages.authHero.src}
          alt={teamImages.authHero.alt}
          fill
          priority
          sizes="(max-width: 1279px) 480px, 560px"
          className="object-cover"
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/95 to-slate-100/90" />
      <div className="absolute inset-x-0 top-0 h-32 bg-blue-50/60" />

      {/* Supporting image card */}
      <div className="absolute -right-14 bottom-20 w-[220px] overflow-hidden rounded-xl border border-[var(--theme-divider-color)] bg-white shadow-xl rotate-3 xl:w-[260px]">
        <Image
          src={teamImages.authSupport.src}
          alt={teamImages.authSupport.alt}
          width={520}
          height={380}
          sizes="(max-width: 1279px) 220px, 260px"
          className="h-auto w-full"
        />
      </div>

      {/* Logo - absolute positioned above background */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight text-[var(--theme-caption-color)]">Serenity</span>
      </div>

      {/* Main content - messaging */}
      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold leading-tight text-[var(--theme-caption-color)]">
            Where teams<br />do their best work
          </h1>
          <p className="text-lg leading-relaxed text-[var(--theme-darker-color)]">
            One platform for messages, projects, and everything your team needs to move fast.
          </p>
        </div>

        {/* Features list - easily customizable */}
        <div className="flex flex-col gap-3">
          {[
            'Real-time collaboration',
            'Multi-workspace support',
            'Enterprise-grade security',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 text-sm text-[var(--theme-content-color)]">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 text-xs text-[var(--theme-darker-color)]">© 2026 Serenity. All rights reserved.</p>
    </>
  )
}
