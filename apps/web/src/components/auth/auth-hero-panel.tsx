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
      <div className="absolute inset-0 opacity-25">
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
      <div className="absolute inset-0 bg-gradient-to-br from-brand/95 via-brand/85 to-brand-hover/80" />

      {/* Supporting image card */}
      <div className="absolute -right-14 bottom-20 w-[220px] xl:w-[260px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl rotate-3">
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
      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight">Serenity</span>
      </div>

      {/* Main content - messaging */}
      <div className="space-y-6 relative z-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold leading-tight">
            Where teams<br />do their best work
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
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
            <div key={feature} className="flex items-center gap-2.5 text-white/80 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-white/30 text-xs relative z-10">© 2026 Serenity. All rights reserved.</p>
    </>
  )
}
