import { getReadiness, getPlatformSignals } from '@/lib/readiness'
import { getCredentialHealth, getPromotionGates } from '@/lib/credential-health'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Readiness' }

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-canvas p-3">
      <p className="text-[10px] uppercase tracking-wide text-fg-disabled">{label}</p>
      <p className="text-[15px] font-semibold text-fg-primary mt-0.5 tabular-nums">{value}</p>
      <p className="text-[10px] text-fg-muted mt-0.5">{sub}</p>
    </div>
  )
}

// Compact text sparkline (no chart lib). Renders a 7-point series with unicode blocks.
function Spark({ label, series, sub }: { label: string; series: number[]; sub: string }) {
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const max = Math.max(1, ...series)
  const spark = series
    .map((n) => blocks[Math.min(blocks.length - 1, Math.round((n / max) * (blocks.length - 1)))])
    .join('')
  return (
    <div className="rounded-lg border border-border-subtle bg-canvas p-3">
      <p className="text-[10px] uppercase tracking-wide text-fg-disabled">{label}</p>
      <p className="text-[16px] font-semibold text-fg-primary mt-0.5 tracking-tight leading-none" aria-hidden>{spark}</p>
      <p className="text-[10px] text-fg-muted mt-1">{sub}</p>
    </div>
  )
}

export default async function ReadinessPage() {
  const [rows, signals, creds, gates] = await Promise.all([
    getReadiness(),
    getPlatformSignals(),
    getCredentialHealth(),
    getPromotionGates(),
  ])

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-fg-primary tracking-tight">Product Readiness Center</h1>
        <p className="text-[13px] text-fg-muted mt-1">
          Per-product outcome validation, readiness, and rejection risk — from live <code>outcome_checks</code>.
          Unverified outcomes are not yet proven.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-4">
        <p className="text-[12px] font-semibold text-fg-primary mb-3">Platform activation</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="Outcome coverage" value={`${signals.outcomeCoveragePct}%`} sub={`${signals.outcomeValidated}/${signals.outcomeTotal} measured`} />
          <Metric label="Outcome pass" value={`${signals.outcomePassPct}%`} sub={`${signals.outcomePass}/${signals.outcomeTotal} pass`} />
          <Metric label="Open issues" value={`${signals.issuesRecent}`} sub={`${signals.issuesTotal} total intake · 7d`} />
          <Metric label="LoveBot responses" value={`${signals.lovebotResponses}`} sub="completed answers" />
          <Metric label="Critical failures" value={`${signals.criticalFailures}`} sub="outcomes marked fail" />
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-4">
        <p className="text-[12px] font-semibold text-fg-primary mb-3">Support &amp; LoveBot</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="LoveBot escalations" value={`${signals.lovebotEscalations}`} sub="needed human / founder" />
          <Metric label="Escalation rate" value={`${signals.escalationRatePct}%`} sub={`${signals.lovebotEscalations}/${signals.lovebotResponses} responses`} />
          <Metric label="First-response" value={`${Math.max(0, 100 - signals.escalationRatePct)}%`} sub="answered without escalation" />
          <Spark label="Issue trend (7d)" series={signals.issueTrend7d} sub="daily new intakes" />
          <Spark label="Escalation trend (7d)" series={signals.escalationTrend7d} sub="daily escalations" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-fg-muted">No outcome checks recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.product} className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-semibold text-fg-primary capitalize">{r.product}</span>
                <span className="text-[11px] text-fg-disabled">
                  {r.latestDeploy ? `deploy: ${r.latestDeploy}` : 'no deploy record'} · {r.total} outcomes
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Readiness" value={`${r.readinessPct}%`} sub={`${r.pass}/${r.total} pass`} />
                <Metric label="Validation" value={`${r.validationPct}%`} sub={`${r.total - r.unverified}/${r.total} checked`} />
                <Metric label="Rejection risk" value={`${r.rejectionRiskPct}%`} sub={`${r.fail} fail · ${r.degraded} degraded`} />
                <Metric label="Language" value="EN ✓" sub={r.languageCoverage} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-fg-disabled">
        Outcome statuses are written by automated probes (software-path) and human-in-loop intake (OCR/voice/journeys).
        Open issues come from <code>mcp_intakes</code>; LoveBot responses from <code>tasks</code>; escalations from <code>pranix_memory</code>. Unverified = not yet measured.
      </p>
    </div>
  )
}
