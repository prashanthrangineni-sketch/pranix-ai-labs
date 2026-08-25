import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HeartPulse, Cpu, Database, ShieldAlert, ChevronRight, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { NeedsYou } from './_components/NeedsYou'
import {
  getSystemPulse,
  getCriticalAlerts,
  getFailurePatterns,
  getProductHealth,
  getPendingGrants,
  getAlertTierCounts,
  getMemoryCount,
  getBusinessSnapshot,
  getPendingIdeas,
  getCompletedTasksStats,
  getScalingHealthScores,
} from '@/lib/queries'

export const metadata: Metadata = { title: 'Overview' }
export const revalidate = 60

// ─────────────────────────────────────────────────────────────────
// RESTRUCTURED 2026-08-25.
//
// This page rendered THIRTEEN top-level blocks, one of which was
// MissionControl — itself ~98 KB and fifteen-plus API-backed panes. Roughly
// twenty-eight sections on a single route, fed by eighteen query functions and
// three API fetches, all refreshing together every sixty seconds. The founder's
// description was "messy and looks like huge things which scare everyone".
//
// WHAT MOVED, AND WHERE
//   MissionControl + JarvisStatusPane  →  /founder/mission-control  (new)
//   TaskBoard                          →  /founder/board            (new)
//   Worker Topology                    →  /founder/workers          (already existed)
//   Recent Activity                    →  /founder/tasks            (already existed)
//   Execution Forensics                →  /founder/memory           (already existed)
//   Orchestration Status               →  /founder/workspace        (already existed)
//   Account Settings                   →  /founder/account          (already in the nav)
//
// Four of those panels were duplicating a route that already existed in the
// sidebar. They were not adding information, only height.
//
// WHAT WAS DELETED
//   Aaria Voice Controls — its own source calls it "a proxy interface for
//     testing Aaria's NLU". A developer test harness on the founder's
//     executive summary.
//   MCQ Explainer Video Engine — MOCKED. handleGenerate is a three-second
//     setTimeout that loads a hardcoded sample clip from mixkit.co. It has
//     never generated a video. It sat on this page looking like a feature.
//
// WHAT REMAINS: what a founder needs in ten seconds — what needs you, the four
// headline numbers, the business snapshot, where alerts are concentrated, and
// which products are unhealthy. Everything else is one click away.
//
// Query functions on this page: 18 → 11. getLatestDigest was also dropped —
// its result was destructured into `digest` and never used. So was
// getFounderActionSummary, a whole helper plus interface that nothing called.
// ─────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Recommendations feed the Needs You queue. Kept because that queue is the
// point of this page; every other API fetch moved out with its panel.
async function fetchFounderApi(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
  if (!base) return null
  const url = `${base.startsWith('http') ? base : `https://${base}`}${path}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function Panel({ title, link, linkHref, children, className = '' }: {
  title: string; link?: string; linkHref?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`rounded-xl border border-border-subtle bg-surface flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">{title}</span>
        {link && linkHref && (
          <Link href={linkHref}
                className="flex items-center gap-0.5 text-[11px] text-accent hover:text-accent/80 transition-colors">
            {link} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

function StatCard({ icon: Icon, iconColor, label, value, sub, valueClass = '' }: {
  icon: React.ElementType; iconColor: string; label: string; value: string | number; sub: string; valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: iconColor + '22' }}>
        <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-fg-muted mb-0.5">{label}</p>
        <p className={`text-xl font-bold leading-none tabular-nums ${valueClass}`}>{value}</p>
        <p className="text-[11px] text-fg-disabled mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function AlertDonut({ p1, p2, p3, p4 }: { p1: number; p2: number; p3: number; p4: number }) {
  const total = p1 + p2 + p3 + p4
  if (total === 0) return <div className="text-fg-disabled text-xs">No alerts</div>
  const segs = [
    { val: p1, color: '#ef4444', label: 'P1 Critical' },
    { val: p2, color: '#f97316', label: 'P2 Error' },
    { val: p3, color: '#f59e0b', label: 'P3 Warn' },
    { val: p4, color: '#3b82f6', label: 'P4 Info' },
  ]
  const cx = 56, cy = 56, r = 44, inner = 28
  let angle = -Math.PI / 2
  const paths = segs.map(s => {
    if (s.val === 0) return null
    const sweep = (s.val / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const ix1 = cx + inner * Math.cos(angle - sweep), iy1 = cy + inner * Math.sin(angle - sweep)
    const ix2 = cx + inner * Math.cos(angle), iy2 = cy + inner * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return <path key={s.label} d={`M${x1},${y1}A${r},${r} 0 ${large},1 ${x2},${y2}L${ix2},${iy2}A${inner},${inner} 0 ${large},0 ${ix1},${iy1}Z`} fill={s.color} />
  })
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {/* Centre labels use currentColor so they follow the theme. They were
            hardcoded to the dark palette's foreground and went invisible the
            moment the dashboard switched to light. */}
        <svg width={112} height={112} viewBox="0 0 112 112" className="text-fg-primary">
          {paths}
          <text x={56} y={52} textAnchor="middle" fill="currentColor" fontSize={16} fontWeight={700}>{total.toLocaleString()}</text>
          <text x={56} y={66} textAnchor="middle" fill="currentColor" fontSize={9} opacity={0.55}>Total</text>
        </svg>
      </div>
      <div className="space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-fg-secondary flex-1">{s.label}</span>
            <span className="font-medium text-fg-primary tabular-nums ml-2">{s.val.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmtINR(n: number) {
  if (!n) return '₹0'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n.toLocaleString('en-IN')}`
}

const PRODUCT_LABELS: Record<string, string> = {
  schoolos: 'SchoolOS', vidyagrid: 'VidyaGrid', quickscanz: 'QuickScanZ',
  cart2save: 'Cart2Save', quietkeep: 'QuietKeep',
}

function statusBadge(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    live:         { label: 'Live',         cls: 'text-severity-success bg-severity-success/12 border border-severity-success/20' },
    pilot:        { label: 'Pilot',        cls: 'text-accent bg-accent-subtle' },
    pre_launch:   { label: 'Pre-launch',   cls: 'text-severity-warn bg-severity-warn/12' },
    out_of_scope: { label: 'No DB access', cls: 'text-fg-disabled bg-elevated' },
    pre_revenue:  { label: 'Pre-revenue',  cls: 'text-severity-warn bg-severity-warn/12' },
    beta:         { label: 'Beta',         cls: 'text-accent bg-accent-subtle' },
    unavailable:  { label: 'Unavailable',  cls: 'text-fg-disabled bg-elevated' },
  }
  return map[status] ?? { label: status, cls: 'text-fg-disabled bg-elevated' }
}

function BusinessCommandCenter({ business }: { business: Awaited<ReturnType<typeof getBusinessSnapshot>> }) {
  if (!business) {
    return (
      <p className="text-[12px] text-fg-muted">
        No business snapshot yet — the daily job has not populated{' '}
        <span className="font-mono">revenue_snapshots</span> (source=business_snapshot_v1).
      </p>
    )
  }
  const order = ['schoolos', 'vidyagrid', 'quickscanz', 'cart2save', 'quietkeep']
  const rows = order.filter((k) => business.products[k]).map((k) => ({ key: k, ...(business.products[k] as any) }))

  const usersOf = (p: any): string =>
    p.students != null ? `${p.students} students`
    : p.users != null ? `${p.users} users`
    : p.signups != null ? `${p.signups} signups`
    : '—'
  const activityOf = (p: any): string =>
    p.activity_label != null ? p.activity_label
    : p.attendance_30d != null ? `${p.attendance_30d.toLocaleString('en-IN')} attendance (30d)`
    : p.test_sessions != null ? `${p.test_sessions} test sessions`
    : p.status === 'pre_launch' ? 'awaiting launch'
    : p.readable === false ? 'deployment-only'
    : '—'
  const revenueOf = (p: any): string =>
    p.revenue_label != null ? p.revenue_label
    : p.fees_collected_inr != null ? fmtINR(p.fees_collected_inr) : '—'
  const healthOf = (p: any): { label: string; cls: string } => {
    if (p.readable === false) return { label: 'Unmonitored', cls: 'text-fg-disabled' }
    const open = (p.alerts_open ?? 0) + (p.risks_open ?? 0) + (p.genome_alerts ?? 0)
    return open === 0 ? { label: 'Healthy', cls: 'text-severity-success' } : { label: `${open} open`, cls: 'text-severity-warn' }
  }

  const thc = 'text-left text-[10px] uppercase tracking-wide text-fg-disabled font-medium pb-2 px-3'
  const tdc = 'text-[12px] text-fg-secondary py-2 px-3 align-middle'

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className={thc}>Product</th>
            <th className={thc}>Status</th>
            <th className={thc}>Users</th>
            <th className={thc}>Activity</th>
            <th className={thc}>Revenue</th>
            <th className={thc}>Health</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const sb = statusBadge(p.status)
            const h = healthOf(p)
            return (
              <tr key={p.key} className="border-t border-border-subtle">
                <td className={`${tdc} font-medium text-fg-primary`}>{PRODUCT_LABELS[p.key] ?? p.key}</td>
                <td className={tdc}><span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${sb.cls}`}>{sb.label}</span></td>
                <td className={`${tdc} tabular-nums`}>{usersOf(p)}</td>
                <td className={`${tdc} tabular-nums`}>
                  <div>{activityOf(p)}</div>
                  {p.instrumentation_note && <div className="text-[10px] text-fg-disabled mt-0.5 normal-case">{p.instrumentation_note}</div>}
                </td>
                <td className={`${tdc} tabular-nums font-semibold ${p.fees_collected_inr ? 'text-severity-success' : 'text-fg-disabled'}`}>{revenueOf(p)}</td>
                <td className={tdc}><span className={`text-[11px] font-medium ${h.cls}`}>{h.label}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-fg-disabled">
        Snapshot {relTime(business.captured_at)} · collected {fmtINR(business.totals?.revenue_collected_inr ?? 0)} of {fmtINR(business.totals?.revenue_billed_inr ?? 0)} billed · Cart2Save &amp; QuietKeep read via the read-only dashboard function (aggregate counts only).
      </p>
    </div>
  )
}

export default async function FounderOverviewPage() {
  const [
    pulse, criticalAlerts, patterns, products, grants,
    tierCounts, memCount, business, pendingIdeas, completedTasksStats, scalingHealth,
  ] = await Promise.all([
    getSystemPulse(),
    getCriticalAlerts(20),
    getFailurePatterns(),
    getProductHealth(),
    getPendingGrants(),
    getAlertTierCounts(),
    getMemoryCount(),
    getBusinessSnapshot(),
    getPendingIdeas(),
    getCompletedTasksStats(),
    getScalingHealthScores(),
  ])

  const recsData = await fetchFounderApi('/api/founder/recommendations')
  const pendingRecommendations = recsData?.recommendations?.filter((r: any) => r.status === 'pending' || !r.status) || []

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* 1 — What needs you. The reason to open this page. */}
      <NeedsYou
        initialAlerts={criticalAlerts}
        pendingGrants={grants}
        pendingRecommendations={pendingRecommendations}
        pendingIdeas={pendingIdeas}
      />

      {/* 2 — The four headline numbers. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={HeartPulse}  iconColor="#22c55e" label="System Health"   value={pulse.isOperational ? 'Healthy' : 'Degraded'} sub={`${pulse.needsAttention} signals need attention`} valueClass={pulse.isOperational ? 'text-severity-success' : 'text-severity-warn'} />
        <StatCard icon={Cpu}         iconColor="#3b82f6" label="Tasks Completed" value={completedTasksStats.today.toLocaleString()}   sub={`${completedTasksStats.week.toLocaleString()} completed this week`} valueClass="text-fg-primary" />
        <StatCard icon={Database}    iconColor="#a855f7" label="Memory"          value={memCount.toLocaleString()}                    sub="Total memories" valueClass="text-fg-primary" />
        <StatCard icon={ShieldAlert} iconColor="#ef4444" label="Critical Alerts" value={pulse.alertCounts.critical}                   sub="Requires attention" valueClass="text-severity-critical" />
      </div>

      {/* 3 — The business. */}
      <Panel title="Founder Business Command Center" link="All products" linkHref="/founder/products">
        <BusinessCommandCenter business={business} />
      </Panel>

      {/* 4 & 5 — Where the pain is. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Alert Summary (24h)" link="View all" linkHref="/founder/alerts">
          <AlertDonut p1={tierCounts.p1} p2={tierCounts.p2} p3={tierCounts.p3} p4={tierCounts.p4} />
          {patterns.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <p className="text-[11px] font-semibold text-fg-muted mb-2">Top Failure Patterns</p>
              {patterns.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between items-center text-[11px] py-1">
                  <span className="text-fg-secondary font-mono truncate max-w-[75%]">{p.fingerprint}</span>
                  <span className="text-severity-error font-semibold ml-2">{p.occurrences}×</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Product Health" link="View all" linkHref="/founder/products">
          <div className="space-y-2.5">
            {products
              .filter(p => !['incubation_slot_1', 'incubation_slot_2', 'crm', 'language_learning'].includes(p.project_name.toLowerCase()))
              .slice(0, 8)
              .map(p => {
                const health = scalingHealth?.products?.[p.project_name]
                const score = health ? health.score : 100
                const isHealthy = score >= 90
                const isWarning = score >= 70 && score < 90
                return (
                  <div key={p.project_name} className="flex flex-col gap-1 border-b border-border-subtle/30 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      {isHealthy ? (
                        <CheckCircle2 className="h-4 w-4 text-severity-success shrink-0" />
                      ) : isWarning ? (
                        <AlertCircle className="h-4 w-4 text-severity-warn shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-severity-critical shrink-0" />
                      )}
                      <span className="flex-1 text-[12px] font-medium text-fg-secondary capitalize">{p.project_name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                        isHealthy ? 'text-severity-success bg-severity-success/12 border border-severity-success/20'
                        : isWarning ? 'text-severity-warn bg-severity-warn/12 border border-severity-warn/20'
                        : 'text-severity-critical bg-severity-critical/12 border border-severity-critical/20'
                      }`}>
                        {score}%
                      </span>
                    </div>
                    {health && (
                      <div className="flex justify-between pl-6.5 text-[10px] text-fg-disabled">
                        <span>Latency: {health.latency_ms}ms</span>
                        <span>Error: {health.error_rate}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </Panel>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-fg-disabled">
        <RefreshCw className="h-3 w-3" />
        <span>Data refreshes every 60s · everything else is in the sidebar</span>
      </div>
    </div>
  )
}
