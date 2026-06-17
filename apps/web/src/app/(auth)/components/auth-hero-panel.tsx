import { Shield, Zap, Users } from 'lucide-react'

export function AuthHeroPanel() {
  return (
    <>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow accent */}
      <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">Serenity</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Where teams<br />
            <span className="text-blue-400">do their best work</span>
          </h1>
          <p className="text-base leading-relaxed text-slate-300">
            One platform for messaging, projects, wikis, and everything your team needs to move fast.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid gap-4">
          {[
            {
              icon: Zap,
              title: 'Real-time collaboration',
              desc: 'Instant messaging and live editing across all your workspaces',
            },
            {
              icon: Shield,
              title: 'Enterprise-grade security',
              desc: 'SOC 2 compliant, end-to-end encrypted, GDPR ready',
            },
            {
              icon: Users,
              title: 'Built for teams of all sizes',
              desc: 'From startups to Fortune 500 — scales as you grow',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer */}
      <p className="relative z-10 text-xs text-slate-500">© 2026 Serenity. All rights reserved.</p>
    </>
  )
}
