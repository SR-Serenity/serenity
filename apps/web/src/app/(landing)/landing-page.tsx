'use client'

import { motion, useInView, useScroll, type Variants } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

/* ─── Animation helpers ──────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = (delay = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
})

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    return scrollY.on('change', (v) => setScrolled(v > 20))
  }, [scrollY])

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-[#ebeef2] bg-white/95 shadow-sm backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <SerenityLogo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#5a667e] sm:flex">
          {['Features', 'Pricing', 'Docs'].map((item) => (
            <motion.a
              key={item}
              href="#"
              whileHover={{ color: '#070738' }}
              transition={{ duration: 0.15 }}
              className="transition-colors hover:text-[#070738]"
            >
              {item}
            </motion.a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://app.guix.tech/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#5a667e] transition-colors hover:text-[#0f121a]"
          >
            Sign in
          </a>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <a
              href="https://app.guix.tech/register"
              className="rounded-lg bg-[#070738] px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(7,7,56,0.3)] transition-colors hover:bg-[#0d0d60]"
            >
              Get started
            </a>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-28 pt-36">
      {/* Subtle radial gradient bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_top,_rgba(7,7,56,0.05)_0%,_transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={stagger(0.12)}
          initial="hidden"
          animate="show"
        >
          {/* Pill badge */}
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e2e6ed] bg-white px-3.5 py-1.5 text-xs font-medium text-[#5a667e] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#05A05C]" />
            Now with AI-powered automation
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-[#a1abbf]">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mb-6 text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.1] tracking-tight text-[#070738]"
          >
            Where teams<br />do their best work.
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#5a667e]"
          >
            Serenity brings messages, projects, and AI into one clean workspace — so your team can focus on what matters, not where to find it.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a
                href="https://app.guix.tech/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#070738] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(7,7,56,0.3)] transition-colors hover:bg-[#0d0d60]"
              >
                Start for free
                <ArrowRight />
              </a>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href="https://app.guix.tech/login"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dde1e9] bg-white px-7 py-3.5 text-sm font-semibold text-[#0f121a] shadow-sm transition-colors hover:bg-[#f8f9fa]"
              >
                Sign in to workspace
              </a>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-xs text-[#a1abbf]">
            No credit card required · Free forever for small teams
          </motion.p>
        </motion.div>

        {/* App window mock */}
        <FadeUp delay={0.3} className="mt-16">
          <AppWindowMock />
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── App window mock ────────────────────────────────────────── */
function AppWindowMock() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* glow */}
      <div className="absolute inset-x-8 -bottom-8 h-24 bg-[radial-gradient(ellipse,_rgba(7,7,56,0.12)_0%,_transparent_70%)] blur-xl" />
      <div className="relative overflow-hidden rounded-2xl border border-[#e2e6ed] bg-[#f8f9fa] shadow-[0_20px_80px_rgba(7,7,56,0.10)]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-[#e2e6ed] bg-white px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md border border-[#e2e6ed] bg-[#f8f9fa] px-3 py-1 text-[11px] text-[#a1abbf]">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M3 5h4M5 3v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            app.serenity.io/acme
          </div>
        </div>
        {/* UI mock content */}
        <div className="flex h-[380px]">
          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-[#e2e6ed] bg-white p-3">
            <div className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="h-5 w-5 rounded bg-[#070738]/10" />
              <div className="h-3 w-20 rounded-full bg-[#070738]/10" />
            </div>
            {['#general', '#engineering', '#design', '#product', '#random'].map((ch, i) => (
              <div key={ch} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-[#070738]/5' : ''}`}>
                <div className="h-1.5 w-1.5 rounded-full bg-[#e2e6ed]" />
                <div className="h-2.5 rounded-full bg-[#e2e6ed]" style={{ width: `${50 + i * 10}px` }} />
              </div>
            ))}
            <div className="mt-4 border-t border-[#e2e6ed] pt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-full bg-[#e2e6ed]" />
                  <div className="h-2.5 rounded-full bg-[#e2e6ed]" style={{ width: `${45 + i * 15}px` }} />
                </div>
              ))}
            </div>
          </div>
          {/* Main chat area */}
          <div className="flex flex-1 flex-col p-5 gap-4">
            {[
              { w: '60%', lines: 2 },
              { w: '45%', lines: 1 },
              { w: '70%', lines: 3 },
            ].map((msg, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#e2e6ed]" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-20 rounded-full bg-[#e2e6ed]" />
                    <div className="h-2 w-10 rounded-full bg-[#f0f2f5]" />
                  </div>
                  {Array.from({ length: msg.lines }).map((_, j) => (
                    <div
                      key={j}
                      className="h-3 rounded-full bg-[#f0f2f5]"
                      style={{ width: j === msg.lines - 1 ? `calc(${msg.w} - 20px)` : msg.w }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* composer */}
            <div className="mt-auto flex items-center gap-2 rounded-xl border border-[#e2e6ed] bg-white px-4 py-3">
              <div className="h-3 w-32 rounded-full bg-[#f0f2f5]" />
              <div className="ml-auto flex gap-2">
                <div className="h-5 w-5 rounded bg-[#f0f2f5]" />
                <div className="h-5 w-5 rounded bg-[#f0f2f5]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Social proof ───────────────────────────────────────────── */
function SocialProof() {
  const companies = ['Acme Corp', 'Veritas Labs', 'Neon Studio', 'Drift Inc', 'Coda Works', 'Slate HQ']
  return (
    <FadeUp>
      <section className="border-y border-[#ebeef2] bg-[#fafafa] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-[#a1abbf]">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {companies.map((name) => (
              <span key={name} className="text-sm font-semibold text-[#c8cdd8]">{name}</span>
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  )
}

/* ─── Feature rows ───────────────────────────────────────────── */
const FEATURES = [
  {
    tag: 'Messaging',
    title: 'A calmer way to communicate',
    description: 'Channels, threads, and DMs keep conversations organised. No more endless email chains — context is always one click away.',
    points: ['Organised channels and threads', 'Rich media and file sharing', 'Search across everything'],
    visual: <ChatVisual />,
  },
  {
    tag: 'Projects',
    title: 'Track work without the noise',
    description: 'Tasks, boards, and timelines so every project has a clear owner, deadline, and status — visible to the whole team.',
    points: ['Drag-and-drop task boards', 'Milestone tracking', 'Real-time progress updates'],
    visual: <BoardVisual />,
    flip: true,
  },
  {
    tag: 'AI',
    title: 'Your team\'s AI co-pilot',
    description: 'Summarise threads, draft replies, surface action items, and automate repetitive work — all from inside your workspace.',
    points: ['Thread and channel summaries', 'Smart reply suggestions', 'Workflow automation rules'],
    visual: <AIVisual />,
  },
]

function FeatureRow({ tag, title, description, points, visual, flip }: typeof FEATURES[0]) {
  return (
    <FadeUp>
      <div className={`flex flex-col items-center gap-14 lg:flex-row ${flip ? 'lg:flex-row-reverse' : ''}`}>
        {/* Text */}
        <div className="flex-1 space-y-5">
          <span className="inline-block rounded-full border border-[#e2e6ed] bg-[#f8f9fa] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#070738]">
            {tag}
          </span>
          <h3 className="text-3xl font-bold tracking-tight text-[#070738]">{title}</h3>
          <p className="text-base leading-relaxed text-[#5a667e]">{description}</p>
          <ul className="space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-[#0f121a]">
                <CheckIcon />
                {p}
              </li>
            ))}
          </ul>
        </div>
        {/* Visual */}
        <div className="w-full flex-1 lg:max-w-lg">{visual}</div>
      </div>
    </FadeUp>
  )
}

function ChatVisual() {
  const messages = [
    { text: 'Just shipped the new dashboard 🚀', w: '55%' },
    { text: 'Looks great! Any blockers for next sprint?', w: '65%', right: true },
    { text: 'Nope — we\'re ahead of schedule', w: '45%' },
    { text: 'Amazing. Let\'s sync after standup', w: '55%', right: true },
  ]
  return (
    <MockCard>
      <div className="space-y-3 p-5">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.right ? 10 : -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`flex ${m.right ? 'justify-end' : ''}`}
          >
            <div
              className={`rounded-2xl px-4 py-2.5 text-xs font-medium ${
                m.right
                  ? 'bg-[#070738] text-white'
                  : 'bg-[#f0f2f5] text-[#0f121a]'
              }`}
              style={{ maxWidth: m.w }}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>
    </MockCard>
  )
}

function BoardVisual() {
  const columns = [
    { label: 'To do', color: '#e2e6ed', cards: ['API refactor', 'Dark mode'] },
    { label: 'In progress', color: '#FFC94D', cards: ['Auth redesign'] },
    { label: 'Done', color: '#05A05C', cards: ['Onboarding flow', 'Email system'] },
  ]
  return (
    <MockCard>
      <div className="flex gap-3 p-4">
        {columns.map((col, ci) => (
          <div key={col.label} className="flex-1">
            <div className="mb-2.5 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11px] font-semibold text-[#5a667e]">{col.label}</span>
            </div>
            <div className="space-y-2">
              {col.cards.map((card, i) => (
                <motion.div
                  key={card}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ci * 0.1 + i * 0.08 }}
                  className="rounded-lg border border-[#e2e6ed] bg-white p-2.5 text-[11px] font-medium text-[#0f121a] shadow-sm"
                >
                  {card}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockCard>
  )
}

function AIVisual() {
  return (
    <MockCard>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#070738]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.2"/><path d="M4 6h4M6 4v4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <span className="text-xs font-semibold text-[#070738]">Serenity AI</span>
        </div>
        {[
          'Summarised 24 messages in #engineering',
          '3 action items identified for @you',
          'Auto-closed 5 resolved tasks',
        ].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="flex items-start gap-2.5 rounded-lg bg-[#f8f9fa] p-3"
          >
            <CheckIcon className="mt-0.5 shrink-0 text-[#05A05C]" />
            <span className="text-xs text-[#0f121a]">{item}</span>
          </motion.div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-[#e2e6ed] bg-white px-3 py-2">
          <span className="flex-1 text-xs text-[#a1abbf]">Ask AI anything…</span>
          <div className="h-5 w-5 rounded bg-[#070738] flex items-center justify-center">
            <ArrowRight className="text-white" size={10} />
          </div>
        </div>
      </div>
    </MockCard>
  )
}

function MockCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e2e6ed] bg-[#f8f9fa] shadow-[0_8px_40px_rgba(7,7,56,0.08)]">
      <div className="flex items-center gap-1.5 border-b border-[#e2e6ed] bg-white px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      </div>
      {children}
    </div>
  )
}

/* ─── Stats ──────────────────────────────────────────────────── */
function StatCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / 40
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 30)
    return () => clearInterval(timer)
  }, [inView, end])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

function Stats() {
  const stats = [
    { value: 50000, suffix: '+', label: 'Teams onboarded' },
    { value: 99, suffix: '.9%', label: 'Uptime SLA' },
    { value: 2, suffix: 'M+', label: 'Messages sent daily' },
    { value: 140, suffix: '+', label: 'Countries' },
  ]
  return (
    <FadeUp>
      <section className="border-y border-[#ebeef2] bg-[#f8f9fa] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="mb-1 text-4xl font-bold tracking-tight text-[#070738]">
                  <StatCounter end={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm text-[#5a667e]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  )
}

/* ─── Testimonials ───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'Serenity replaced four different tools for us. The team adopted it in a day.',
    author: 'Sarah K.',
    role: 'CTO, Veritas Labs',
  },
  {
    quote: 'Finally a workspace that doesn\'t feel like a chore. The AI summaries alone save us hours.',
    author: 'Marcus T.',
    role: 'Head of Product, Neon Studio',
  },
  {
    quote: 'The search is instant, the channels are clean. I don\'t miss Slack at all.',
    author: 'Priya M.',
    role: 'Engineering Lead, Acme Corp',
  },
]

function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUp>
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-[#070738]">Loved by teams everywhere</h2>
            <p className="text-[#5a667e]">Don't take our word for it.</p>
          </div>
        </FadeUp>
        <div className="grid gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp key={t.author} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl border border-[#ebeef2] bg-white p-6 shadow-[0_2px_12px_rgba(7,7,56,0.04)]">
                <QuoteIcon className="mb-4 text-[#dde1e9]" />
                <p className="mb-6 flex-1 text-sm leading-relaxed text-[#0f121a]">{t.quote}</p>
                <div>
                  <div className="text-sm font-semibold text-[#070738]">{t.author}</div>
                  <div className="text-xs text-[#a1abbf]">{t.role}</div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Final CTA ──────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <FadeUp>
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-[#070738] px-8 py-16 text-center">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full border border-white/5" />
            <div className="pointer-events-none absolute -right-8 -bottom-8 h-48 w-48 rounded-full border border-white/5" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-64 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to bring your team together?
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-base text-white/60">
              Create your workspace in minutes. Free forever for small teams, no credit card needed.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
              <a
                href="https://app.guix.tech/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#070738] shadow-lg transition-colors hover:bg-[#f0f2f5]"
              >
                Get started for free
                <ArrowRight />
              </a>
            </motion.div>
          </div>
        </div>
      </section>
    </FadeUp>
  )
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
  ]
  return (
    <footer className="border-t border-[#ebeef2] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 grid gap-8 sm:grid-cols-4">
          <div className="space-y-3">
            <SerenityLogo />
            <p className="max-w-[180px] text-xs leading-relaxed text-[#a1abbf]">
              The workspace your team will actually love.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#0f121a]">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#5a667e] transition-colors hover:text-[#0f121a]">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#ebeef2] pt-8 text-xs text-[#a1abbf] sm:flex-row">
          <span>© 2026 Serenity. All rights reserved.</span>
          <span>Built for teams that care about craft.</span>
        </div>
      </div>
    </footer>
  )
}

/* ─── Shared icons / logo ────────────────────────────────────── */
function SerenityLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#070738] shadow-sm">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="white" />
        </svg>
      </div>
      <span className="text-sm font-bold tracking-tight text-[#070738]">Serenity</span>
    </div>
  )
}

function ArrowRight({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="7" fill="#070738" fillOpacity="0.08" />
      <path d="M5 8l2 2 4-4" stroke="#070738" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QuoteIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 11l3-3h3v6H6l-3 3V11zm10 0l3-3h3v6h-3l-3 3V11z" fill="currentColor" />
    </svg>
  )
}

/* ─── Root export ────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0f121a] antialiased">
      <Navbar />
      <Hero />
      <SocialProof />
      <section className="py-24">
        <div className="mx-auto max-w-6xl space-y-28 px-6">
          {FEATURES.map((f) => (
            <FeatureRow key={f.tag} {...f} />
          ))}
        </div>
      </section>
      <Stats />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  )
}
