import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Shield, Cpu, Database, Eye, GitBranch, Layers } from 'lucide-react'

const PRODUCTS = [
  { name: 'Cart2Save', desc: 'AI-powered commerce with ONDC integration', url: 'https://www.cart2save.com', phase: 'Advanced MVP' },
  { name: 'EdProSys', desc: 'Comprehensive school operations platform', url: 'https://www.edprosys.com', phase: 'Phase 2 — RBAC' },
  { name: 'VidyaGrid', desc: 'Adaptive learning for Class 9-10 Mathematics', url: null, phase: 'Intelligence Layer' },
  { name: 'QuietKeep', desc: 'Voice-first personal and business OS', url: 'https://www.quietkeep.com', phase: 'Voice Pipeline' },
  { name: 'QuickScanZ', desc: 'Warranty lifecycle and product tracking', url: 'https://www.quickscanz.com', phase: 'Post-MVP' },
] as const

const PRINCIPLES = [
  { icon: Shield, title: 'Deterministic First', desc: '60% of operations use rules, SQL, and state machines — no LLM needed. Reliable, auditable, zero-cost.' },
  { icon: Cpu, title: 'Sovereign Infrastructure', desc: 'Postgres is the single source of truth. Every token, task, and event lives in databases we own.' },
  { icon: Eye, title: 'Supervised Autonomy', desc: 'Agents handle 90% of work. Humans review the 10% that touches production. No uncontrolled execution.' },
  { icon: Database, title: 'Provider Neutral', desc: 'Inference routes through NVIDIA, Anthropic, OpenAI, or local models. No vendor lock-in.' },
  { icon: GitBranch, title: 'Event Sourced', desc: 'Every task lifecycle transition is recorded. Fully replayable. Crash-recoverable.' },
  { icon: Layers, title: 'Multi-Product', desc: 'One control plane orchestrates all products. Shared workers, shared memory, shared audit trail.' },
] as const

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(217,72%,48%,0.04)] to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="flex flex-col items-center text-center">
            <Image src="/logo.png" alt="Pranix AI Labs" width={80} height={80} className="rounded-2xl shadow-lg" priority />
            <h1 className="mt-8 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Innovate. Build. Ascend.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[hsl(var(--fg-secondary))]">
              Protocol-grade operational infrastructure for AI-assisted execution.
              Deterministic-first orchestration with supervised autonomy.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/products" className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent-default))] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--accent-hover))]">
                Explore Products <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/infrastructure" className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border-strong))] px-6 py-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--bg-elevated))]">
                View Infrastructure
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold md:text-3xl">How We Build</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[hsl(var(--fg-secondary))]">
            Every system is built on operational principles, not marketing narratives.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-xl border border-[hsl(var(--border-subtle))] bg-white p-6 transition-shadow hover:shadow-md">
                <p.icon className="h-6 w-6 text-[hsl(var(--accent-default))]" />
                <h3 className="mt-4 text-sm font-semibold">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--fg-secondary))]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="border-t border-[hsl(var(--border-subtle))]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold md:text-3xl">Product Ecosystem</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="group rounded-xl border border-[hsl(var(--border-subtle))] p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className="rounded-full bg-[hsl(var(--accent-subtle))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--accent-default))]">{p.phase}</span>
                </div>
                <p className="mt-2 text-xs text-[hsl(var(--fg-secondary))]">{p.desc}</p>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--accent-default))] hover:underline">
                    Visit <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))]">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-xl font-semibold md:text-2xl">Operational Infrastructure You Can Trust</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[hsl(var(--fg-secondary))]">
            Built in Hyderabad. Protocol-grade. Deterministic-first. Provider-neutral.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/status" className="rounded-lg border border-[hsl(var(--border-strong))] px-5 py-2.5 text-sm font-medium hover:bg-[hsl(var(--bg-elevated))]">
              Live Status
            </Link>
            <a href="mailto:founder@pranixailabs.com" className="rounded-lg bg-[hsl(var(--accent-default))] px-5 py-2.5 text-sm font-medium text-white hover:bg-[hsl(var(--accent-hover))]">
              Contact
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
