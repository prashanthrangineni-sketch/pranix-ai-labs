'use client'

import { useState }       from 'react'
import { Loader2, Hash, X, Wrench, Calendar, BadgeCheck, MinusCircle, AlertOctagon, ChevronDown } from 'lucide-react'
import type { ReplayData, IntegrityStatus, ReplayStep } from '../ask/ask-chat'

// ── ViewReplayButton ─────────────────────────────────────────────────────────
// Renders a small "View Replay" button inline inside AgentTaskHistoryRow.
// On first click it fetches /api/founder/replay?task_id= and opens an
// inline accordion.  Read-only — no writes of any kind.

export function ViewReplayButton({ taskId }: { taskId: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData]       = useState<ReplayData | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function load() {
    if (data) { setOpen(o => !o); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/founder/replay?task_id=${encodeURIComponent(taskId)}`)
      if (!res.ok) { setError('Could not load replay'); return }
      const json = await res.json() as ReplayData
      setData(json)
      setOpen(true)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-canvas px-2.5 py-1 text-[10px] font-medium text-fg-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-60"
      >
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Hash className="h-3 w-3" />}
        View Replay
      </button>

      {error && (
        <p className="mt-1 text-[10px] text-severity-critical">{error}</p>
      )}

      {open && data && (
        <div className="mt-2 rounded-xl border border-border-subtle bg-surface overflow-hidden">
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-fg-muted" />
              <span className="text-[12px] font-semibold text-fg-primary">Evidence Replay</span>
              <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                {data.replay.length} steps
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-fg-disabled hover:text-fg-primary"
              aria-label="Close replay"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <InlineReplayView data={data} />
        </div>
      )}
    </div>
  )
}

// ── InlineReplayView ─────────────────────────────────────────────────────────
function InlineReplayView({ data }: { data: ReplayData }) {
  const [openStep, setOpenStep] = useState<string | null>(null)
  const v = data.verification

  const integrityStyle: Record<IntegrityStatus, { icon: React.ReactNode; text: string; cls: string }> = {
    verified: {
      icon: <BadgeCheck className="h-3 w-3 text-accent" />,
      text: 'verified',
      cls:  'text-accent bg-accent/[0.07] border-accent/20',
    },
    partial: {
      icon: <MinusCircle className="h-3 w-3 text-severity-warn" />,
      text: 'partial',
      cls:  'text-severity-warn bg-severity-warn/[0.08] border-severity-warn/20',
    },
    failed: {
      icon: <AlertOctagon className="h-3 w-3 text-severity-critical" />,
      text: 'failed',
      cls:  'text-severity-critical bg-severity-critical/[0.08] border-severity-critical/20',
    },
  }
  const iv = integrityStyle[v.integrity_status]

  return (
    <div className="divide-y divide-border-subtle">
      {/* Verification summary */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] text-fg-muted">{v.verified_steps}/{v.total_steps} verified</span>
        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${iv.cls}`}>
          {iv.icon} Integrity: {iv.text}
        </span>
      </div>

      {/* Steps */}
      {data.replay.map((step: ReplayStep, idx: number) => {
        const isOpen    = openStep === step.step_id
        const hasResult = step.raw_result !== null
        return (
          <div key={step.step_id}>
            <button
              onClick={() => setOpenStep(isOpen ? null : step.step_id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-elevated"
              aria-expanded={isOpen}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-elevated text-[9px] font-semibold text-fg-muted">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[10px] font-medium text-fg-primary">
                  <Wrench className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
                  <span className="truncate font-mono">{step.tool}</span>
                </p>
                <p className="truncate text-[9px] text-fg-muted">{step.result_summary.slice(0, 60)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                hasResult ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-disabled'
              }`}>
                {hasResult ? 'evidence' : 'inferred'}
              </span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-fg-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="space-y-1.5 bg-elevated px-3 pb-3 pt-1">
                <Row label="Tool">
                  <span className="break-all font-mono text-[10px] text-fg-primary">{step.tool}</span>
                </Row>
                <Row label="Time">
                  <span className="text-[10px] text-fg-secondary">
                    <Calendar className="inline h-2.5 w-2.5 mr-0.5" />
                    {new Date(step.executed_at).toLocaleString()}
                  </span>
                </Row>
                <Row label="Hash">
                  <span className="break-all font-mono text-[9px] text-fg-muted">
                    {step.evidence_hash.slice(0, 12)}…{step.evidence_hash.slice(-8)}
                  </span>
                </Row>
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-fg-disabled">Result</span>
                  <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-all rounded bg-canvas px-2 py-1 text-[9px] leading-relaxed text-fg-secondary">
                    {step.result_summary}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 w-10 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-fg-disabled">{label}</span>
      {children}
    </div>
  )
}
