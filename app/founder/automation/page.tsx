import type { Metadata } from 'next'
import { Workflow, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { readExecutionMemory } from '@/lib/execution-memory'

export const metadata: Metadata = { title: 'Automation' }
export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────

type Dispatch = {
  id: string
  title: string
  resource: string
  phase: 'assigned' | 'in_progress' | 'needs_test' | 'testing' | 'done' | 'blocked_founder' | string
  target_ref?: string
  notes?: string
  next_step_hint?: string
  last_checked_at?: string
}

// This mirrors the Cowork scheduler config exactly (SKILL.md files on Mr.
// Rao's machine). Cowork's own scheduler is a separate system from this
// dashboard's Supabase-backed control plane, so its cadence can't be queried
// live from here — this list is a reference snapshot, kept in sync manually
// whenever a task is added/changed. The dispatch state below IS live, since
// the orchestrator writes it to the same execution_memory table this
// dashboard reads.
const SCHEDULED_WORKFLOWS = [
  { id: 'pranix-continuous-orchestrator', cadence: 'Every 30 minutes', purpose: 'Checks on in-flight Aaria/Antigravity/Perplexity work, auto-continues it, assigns new backlog items, routes finished work to a different resource for verification.' },
  { id: 'pranix-work-dispatcher', cadence: 'Every 3 hours', purpose: 'Assigns the next unblocked pending task to whichever worker is idle.' },
  { id: 'pranix-worker-health-monitor', cadence: 'Every 6 hours', purpose: 'Flags silent/stale worker channels (Antigravity, Perplexity, Claude Code) so work can be reassigned.' },
  { id: 'pranix-portfolio-health-check', cadence: 'Hourly', purpose: 'Checks for pending founder approvals and stalled activity; alerts only if something needs attention.' },
  { id: 'pranix-email-triage-daily', cadence: 'Daily, 8:09 AM', purpose: 'Triages pranixailabs@gmail.com, labels mail, drafts routine replies for review (never sends).' },
  { id: 'pranix-tech-radar', cadence: 'Weekly, Monday 8:04 AM', purpose: 'Scans for better/cheaper tools relevant to Pranix products; logs candidates, never auto-adopts.' },
] as const

const PHASE_STYLE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  assigned:        { label: 'Assigned',        className: 'bg-accent-subtle text-accent',                icon: <Clock className="h-3 w-3" /> },
  in_progress:     { label: 'In progress',     className: 'bg-amber-500/10 text-amber-500',               icon: <Loader2 className="h-3 w-3" /> },
  needs_test:      { label: 'Needs test',      className: 'bg-amber-500/10 text-amber-500',               icon: <AlertTriangle className="h-3 w-3" /> },
  testing:         { label: 'Testing',         className: 'bg-amber-500/10 text-amber-500',               icon: <Loader2 className="h-3 w-3" /> },
  done:            { label: 'Done',            className: 'bg-emerald-500/10 text-emerald-500',           icon: <CheckCircle2 className="h-3 w-3" /> },
  blocked_founder: { label: 'Needs you',       className: 'bg-red-500/10 text-red-500',                   icon: <AlertTriangle className="h-3 w-3" /> },
}

function rel(iso?: string) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

async function getDispatches(): Promise<Dispatch[]> {
  try {
    const value = await readExecutionMemory('pranix-portfolio', 'orchestrator_dispatches')
    if (!value) return []
    const v = value as { dispatches?: Dispatch[] } | Dispatch[]
    if (Array.isArray(v)) return v
    return v.dispatches ?? []
  } catch {
    return []
  }
}

export default async function FounderAutomationPage() {
  const dispatches = await getDispatches()
  const blocked = dispatches.filter((d) => d.phase === 'blocked_founder')
  const active = dispatches.filter((d) => d.phase !== 'done' && d.phase !== 'blocked_founder')
  const done = dispatches.filter((d) => d.phase === 'done')

  return (
    <div className="px-4 py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Workflow className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Automation</h1>
      </div>
      <p className="text-[13px] text-fg-muted -mt-4">
        What the always-on orchestrator is doing right now, without you having to ask it to continue.
      </p>

      {blocked.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-red-500">Needs your decision ({blocked.length})</h2>
          <div className="space-y-2">
            {blocked.map((d) => (
              <DispatchCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Active work ({active.length})</h2>
        {active.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface px-4 py-5">
            <p className="text-xs text-fg-muted">No dispatches recorded yet, or the orchestrator hasn&apos;t run since this page was added.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((d) => (
              <DispatchCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-fg-muted">Recently completed ({done.length})</h2>
          <div className="space-y-2">
            {done.map((d) => (
              <DispatchCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2 pt-2">
        <h2 className="text-xs font-medium text-fg-muted">Scheduled workflows (reference)</h2>
        <p className="text-[11px] text-fg-disabled">
          These run on Claude Cowork&apos;s own scheduler on Mr. Rao&apos;s machine, separate from this dashboard&apos;s database — this list is a manually-kept snapshot, not a live feed.
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface divide-y divide-border-subtle">
          {SCHEDULED_WORKFLOWS.map((w) => (
            <div key={w.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-fg-primary">{w.id}</span>
                <span className="text-[11px] text-fg-disabled shrink-0">{w.cadence}</span>
              </div>
              <p className="text-[12px] text-fg-muted mt-1">{w.purpose}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function DispatchCard({ d }: { d: Dispatch }) {
  const style = PHASE_STYLE[d.phase] ?? { label: d.phase, className: 'bg-elevated text-fg-muted', icon: <Clock className="h-3 w-3" /> }
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-fg-primary">{d.title}</span>
        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${style.className}`}>
          {style.icon}
          {style.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-fg-disabled">
        <span className="uppercase tracking-wide">{d.resource}</span>
        {d.target_ref && <span className="truncate">· {d.target_ref}</span>}
        <span className="ml-auto shrink-0">checked {rel(d.last_checked_at)}</span>
      </div>
      {d.notes && <p className="text-[12px] text-fg-muted">{d.notes}</p>}
      {d.next_step_hint && (
        <p className="text-[11px] text-fg-disabled italic">Next: {d.next_step_hint}</p>
      )}
    </div>
  )
}
