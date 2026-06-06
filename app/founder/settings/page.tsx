/**
 * app/founder/settings/page.tsx
 * P9 — Founder Settings: Founder Mode selector.
 * Renders 4 mode cards (A–D). Active mode highlighted.
 * Changing mode POSTs to /api/founder/modes (execution_memory only).
 */

import type { Metadata } from 'next'
import { Settings2, CheckCircle2, Circle, Shield, Zap, Eye, Bot } from 'lucide-react'
import type { FounderMode, ModeId } from '@/app/api/founder/modes/route'
import { ModeSwitcher }              from './_components/mode-switcher'

export const metadata: Metadata = { title: 'Founder Settings' }
export const revalidate = 0

async function getModes(): Promise<{ active_mode: FounderMode; modes: FounderMode[] }> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    if (!base) return { active_mode: fallbackMode('MODE_A'), modes: fallbackModes() }
    const url = `${base.startsWith('http') ? base : `https://${base}`}/api/founder/modes`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { active_mode: fallbackMode('MODE_A'), modes: fallbackModes() }
    return res.json()
  } catch {
    return { active_mode: fallbackMode('MODE_A'), modes: fallbackModes() }
  }
}

// Minimal fallbacks so the page renders even if the API is cold-starting
function fallbackMode(id: ModeId): FounderMode {
  return fallbackModes().find(m => m.mode_id === id) ?? fallbackModes()[0]
}
function fallbackModes(): FounderMode[] {
  return [
    { mode_id: 'MODE_A', name: 'Founder Controlled',   description: 'No execution. Plans and recommendations only.',                                  execution_allowed: false, auto_execute_read_only: false, auto_execute_low_risk: false, founder_approval_required: true,  enabled: true, capabilities: ['Recommendations','Plans','Replay','Read-only inspection'], restrictions: ['No execution','No writes','No deployments'] },
    { mode_id: 'MODE_B', name: 'Approval Driven',      description: 'Read-only MCP tools allowed. Execution requires founder approval.',               execution_allowed: true,  auto_execute_read_only: false, auto_execute_low_risk: false, founder_approval_required: true,  enabled: true, capabilities: ['MCP Reads','Replay','Verification','Recommendations'],          restrictions: ['No writes','No deployments','Approval required'] },
    { mode_id: 'MODE_C', name: 'Semi Autonomous',      description: 'Read-only automatic. Low-risk automatic. High-risk requires approval.',           execution_allowed: true,  auto_execute_read_only: true,  auto_execute_low_risk: true,  founder_approval_required: false, enabled: true, capabilities: ['Auto read-only','Auto low-risk','MCP reads + writes','Recommendations'], restrictions: ['High-risk requires approval','No production deploys without approval'] },
    { mode_id: 'MODE_D', name: 'Autonomous Operator',  description: 'Governance and Scheduler decide. Founder reviews outcomes only.',                execution_allowed: true,  auto_execute_read_only: true,  auto_execute_low_risk: true,  founder_approval_required: false, enabled: true, capabilities: ['Full governance-gated execution','Scheduler-driven','Auto read + writes','Outcome review'], restrictions: ['Governance violations still block','Production deploys still need approval'] },
  ]
}

const MODE_ICON: Record<ModeId, React.ElementType> = {
  MODE_A: Shield,
  MODE_B: Eye,
  MODE_C: Zap,
  MODE_D: Bot,
}

const MODE_COLOR: Record<ModeId, { ring: string; bg: string; icon: string; badge: string; activeBg: string }> = {
  MODE_A: {
    ring:     'border-fg-disabled/40',
    bg:       'bg-surface',
    icon:     'text-fg-muted',
    badge:    'bg-elevated text-fg-muted',
    activeBg: 'border-accent/40 bg-accent/[0.04]',
  },
  MODE_B: {
    ring:     'border-accent/30',
    bg:       'bg-surface',
    icon:     'text-accent',
    badge:    'bg-accent/10 text-accent',
    activeBg: 'border-accent/50 bg-accent/[0.06]',
  },
  MODE_C: {
    ring:     'border-severity-warn/30',
    bg:       'bg-surface',
    icon:     'text-severity-warn',
    badge:    'bg-severity-warn/10 text-severity-warn',
    activeBg: 'border-severity-warn/50 bg-severity-warn/[0.05]',
  },
  MODE_D: {
    ring:     'border-severity-success/30',
    bg:       'bg-surface',
    icon:     'text-severity-success',
    badge:    'bg-severity-success/10 text-severity-success',
    activeBg: 'border-severity-success/50 bg-severity-success/[0.04]',
  },
}

export default async function FounderSettingsPage() {
  const { active_mode, modes } = await getModes()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7">

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg-primary">Founder Settings</h1>
        </div>
        <p className="text-[13px] text-fg-muted">
          Configure how autonomously Pranix operates. Changes persist immediately.
        </p>
      </header>

      {/* ── P9: Founder Mode section ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-fg-secondary">Operating Mode</h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            {active_mode.name}
          </span>
        </div>
        <p className="text-[12px] text-fg-muted max-w-prose">
          The operating mode is a global autonomy ceiling. Governance policies (P8) still apply
          within the selected mode — they restrict individual operations, not the global level.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modes.map((mode) => {
            const isActive = mode.mode_id === active_mode.mode_id
            const colors   = MODE_COLOR[mode.mode_id]
            const Icon     = MODE_ICON[mode.mode_id]

            return (
              <div
                key={mode.mode_id}
                className={`rounded-xl border p-4 space-y-3 transition-all ${
                  isActive ? colors.activeBg : `${colors.ring} ${colors.bg}`
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated ${colors.icon}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-fg-primary">{mode.name}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors.badge}`}>
                          {mode.mode_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Active indicator */}
                  {isActive ? (
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${colors.icon}`} />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 mt-0.5 text-fg-disabled" />
                  )}
                </div>

                {/* Description */}
                <p className="text-[12px] text-fg-secondary leading-relaxed">{mode.description}</p>

                {/* Capabilities */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Capabilities</p>
                  <ul className="space-y-0.5">
                    {mode.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-severity-success">
                        <span className="text-[10px]">✓</span>
                        <span className="text-fg-secondary">{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restrictions */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Restrictions</p>
                  <ul className="space-y-0.5">
                    {mode.restrictions.map((r, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-[10px] text-severity-critical">✗</span>
                        <span className="text-fg-muted">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select button */}
                <ModeSwitcher
                  modeId={mode.mode_id}
                  isActive={isActive}
                  colorCls={isActive ? colors.icon : 'text-fg-disabled'}
                />
              </div>
            )
          })}
        </div>

        {/* Execution rules legend */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
          <p className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wide">Execution Rules by Mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              { id: 'A', rule: 'Everything blocked — plans only' },
              { id: 'B', rule: 'Read-only allowed with approval' },
              { id: 'C', rule: 'Read-only automatic, low-risk automatic' },
              { id: 'D', rule: 'Governance + Scheduler decide' },
            ].map(({ id, rule }) => (
              <div key={id} className="flex items-start gap-2 text-[11px]">
                <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 font-bold text-fg-muted text-[10px]">MODE_{id}</span>
                <span className="text-fg-secondary">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
