import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HeartPulse, Cpu, Database, ListOrdered, ShieldAlert,
  Circle, Activity, ChevronRight, CheckCircle2, AlertCircle,
  Clock, Zap, RefreshCw,
} from 'lucide-react'
import { MissionControl } from './_components/MissionControl'
import { NeedsYou } from './_components/NeedsYou'
import { TaskBoard } from './_components/TaskBoard'
import { AariaControlsWidget } from './_components/AariaControlsWidget'
import { VideoUIWidget } from './_components/VideoUIWidget'
import { JarvisStatusPane } from './_components/JarvisStatusPane'
import {
  getSystemPulse,
  getCriticalAlerts,
  getFailurePatterns,
  getProductHealth,
  getPendingGrants,
  getLatestDigest,
  getWorkerNodes,
  getOrchestrationProviders,
  getRecentActivity,
  getLatestForensic,
  getAlertTierCounts,
  getMemoryCount,
  getBusinessSnapshot,
  getPendingIdeas,
  getCompletedTasksStats,
  getTaskBoardData,
  getLatestVideos,
} from '@/lib/queries'

export const metadata: Metadata = { title: 'Overview' }
export const revalidate = 60

// ── helpers ──────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  deterministic: { label: 'Pranix Native',        color: '#3b82f6' },
  groq:          { label: 'Groq / Qwen3-32b',     color: '#f59e0b' },
  openrouter:    { label: 'OpenRouter (free)',     color: '#a855f7' },
  gemini:        { label: 'Gemini',                color: '#22c55e' },
  jina:          { label: 'Jina Embeddings',       color: '#6b7280' },
  ollama:        { label: 'Ollama Local',          color: '#ef4444' },
  nvidia:        { label: 'NVIDIA',                color: '#6b7280' },
  kimi:          { label: 'Kimi',                  color: '#6b7280' },
  anthropic:     { label: 'Anthropic / Claude',    color: '#f97316' },
}

function providerDot(status: string) {
  if (status === 'ok') return 'bg-severity-success'
  if (status === 'offline' || status === 'disabled_billing_required') return 'bg-severity-critical'
  if (status === 'free_models_only' || status === 'configured') return 'bg-severity-warn'
  return 'bg-fg-disabled'
}
function providerLabel(status: string) {
  const map: Record<string, string> = {
    ok: 'Active',
    offline: 'Offline',
    free_models_only: 'Free only',
    configured: 'Configured',
    disabled_billing_required: 'Needs billing',
    disabled_free_only_policy: 'Disabled',
    disabled_paid_model_only: 'Disabled',
  }
  return map[status] ?? status
}

// ── Founder Action Required summary (task #19) ─────────────────────
// Consolidates every surface that already tracks something needing a
// founder decision (grants, blocked authority, blocked operations, pending
// recommendations) into one count on the main overview page. Read-only and
// purely additive: reuses the same /api/founder/* endpoints and
// try/catch-empty pattern already used on the approvals page
// (app/founder/approvals/page.tsx's fetchFromBase) — doesn't touch that
// page or its logic at all.

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

interface FounderActionSummary {
  grants: number
  blockedAuthority: number
  blockedOperations: number
  pendingRecommendations: number
  total: number
}

async function getFounderActionSummary(grantsCount: number): Promise<FounderActionSummary> {
  const [authority, operations, recommendations] = await Promise.all([
    fetchFounderApi('/api/founder/authority'),
    fetchFounderApi('/api/founder/operations'),
    fetchFounderApi('/api/founder/recommendations'),
  ])
  const blockedAuthority = Array.isArray(authority?.blocked) ? authority.blocked.length : 0
  const blockedOperations = Array.isArray(operations?.blocked) ? operations.blocked.length : 0
  const pendingRecommendations = Array.isArray(recommendations?.recommendations)
    ? recommendations.recommendations.filter((r: any) => r?.status === 'pending' || !r?.status).length
    : 0
  return {
    grants: grantsCount,
    blockedAuthority,
    blockedOperations,
    pendingRecommendations,
    total: grantsCount + blockedAuthority + blockedOperations + pendingRecommendations,
  }
}

// ── sub-components ────────────────────────────────────────────────

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

// Donut chart rendered as SVG
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
        <svg width={112} height={112} viewBox="0 0 112 112">
          {paths}
          <text x={56} y={52} textAnchor="middle" fill="hsl(220 14% 92%)" fontSize={16} fontWeight={700}>{total.toLocaleString()}</text>
          <text x={56} y={66} textAnchor="middle" fill="hsl(220 7% 52%)" fontSize={9}>Total</text>
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

// ── Founder Business Command Center (Phase G) ─────────────────────

function fmtINR(n: number) {
  if (!n) return '\u20b90'
  if (n >= 10000000) return `\u20b9${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `\u20b9${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `\u20b9${(n / 1000).toFixed(1)}k`
  return `\u20b9${n.toLocaleString('en-IN')}`
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
    pre_revenue:  { label: 'Pre-revenue', cls: 'text-severity-warn bg-severity-warn/12' },
    beta:         { label: 'Beta',        cls: 'text-accent bg-accent-subtle' },
    unavailable:  { label: 'Unavailable', cls: 'text-fg-disabled bg-elevated' },
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
    : '\u2014'
  const activityOf = (p: any): string =>
    p.activity_label != null ? p.activity_label
    : p.attendance_30d != null ? `${p.attendance_30d.toLocaleString('en-IN')} attendance (30d)`
    : p.test_sessions != null ? `${p.test_sessions} test sessions`
    : p.status === 'pre_launch' ? 'awaiting launch'
    : p.readable === false ? 'deployment-only'
    : '\u2014'
  const revenueOf = (p: any): string =>
    p.revenue_label != null ? p.revenue_label
    : p.fees_collected_inr != null ? fmtINR(p.fees_collected_inr) : '\u2014'
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

// ── page ─────────────────────────────────────────────────────────

export default async function FounderOverviewPage() {
  const [
    pulse, criticalAlerts, patterns, products, grants, digest,
    workers, providers, activity, forensic, tierCounts, memCount, business,
    pendingIdeas, completedTasksStats, taskBoardData, recentVideos,
  ] = await Promise.all([
    getSystemPulse(),
    getCriticalAlerts(20),
    getFailurePatterns(),
    getProductHealth(),
    getPendingGrants(),
    getLatestDigest(),
    getWorkerNodes(),
    getOrchestrationProviders(),
    getRecentActivity(6),
    getLatestForensic(),
    getAlertTierCounts(),
    getMemoryCount(),
    getBusinessSnapshot(),
    getPendingIdeas(),
    getCompletedTasksStats(),
    getTaskBoardData(),
    getLatestVideos(5),
  ])

  const recsData = await fetchFounderApi('/api/founder/recommendations')
  const pendingRecommendations = recsData?.recommendations?.filter((r: any) => r.status === 'pending' || !r.status) || []

  const nextDigest = new Date()
  nextDigest.setUTCHours(3, 30, 0, 0) // 05:00 IST = 03:30 UTC
  if (nextDigest <= new Date()) nextDigest.setDate(nextDigest.getDate() + 1)
  const diffMs = nextDigest.getTime() - Date.now()
  const diffH = Math.floor(diffMs / 3600000)
  const diffM = Math.floor((diffMs % 3600000) / 60000)

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── Needs You Queue ── */}
      <NeedsYou
        initialAlerts={criticalAlerts}
        pendingGrants={grants}
        pendingRecommendations={pendingRecommendations}
        pendingIdeas={pendingIdeas}
      />

      {/* ── Stat bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={HeartPulse}  iconColor="#22c55e" label="System Health"  value={pulse.isOperational ? 'Healthy' : 'Degraded'} sub={`${pulse.needsAttention} signals need attention`}  valueClass={pulse.isOperational ? 'text-severity-success' : 'text-severity-warn'} />
        <StatCard icon={Cpu}         iconColor="#3b82f6" label="Tasks Completed" value={completedTasksStats.today.toLocaleString()} sub={`${completedTasksStats.week.toLocaleString()} completed this week`} valueClass="text-fg-primary" />
        <StatCard icon={Database}    iconColor="#a855f7" label="Memory"         value={memCount.toLocaleString()}                   sub="Total memories" valueClass="text-fg-primary" />
        <StatCard icon={ShieldAlert} iconColor="#ef4444" label="Critical Alerts" value={pulse.alertCounts.critical}                 sub="Requires attention" valueClass="text-severity-critical" />
      </div>

      {/* ── JARVIS Command Centre status pane & one-tap approvals ── */}
      <section aria-label="JARVIS Status Pane">
        <JarvisStatusPane initialGrants={grants} providers={providers} recentVideos={recentVideos} />
      </section>

      {/* ── P4 Mission Control ── */}
      <section aria-label="Mission Control">
        <MissionControl />
      </section>

      {/* ── Project-wise Task Board ── */}
      <section aria-label="Project Task Board">
        <TaskBoard
          missions={taskBoardData.missions}
          steps={taskBoardData.steps}
          heartbeats={taskBoardData.heartbeats}
        />
      </section>

      {/* ── Founder Business Command Center (Phase G) ── */}
      <Panel title="Founder Business Command Center" link="All products" linkHref="/founder/products">
        <BusinessCommandCenter business={business} />
      </Panel>

      {/* ── Command Centre Integration (Phase 2) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="🎙 Aaria Voice Controls">
          <AariaControlsWidget />
        </Panel>
        <Panel title="🎬 MCQ Explainer Video Engine">
          <VideoUIWidget />
        </Panel>
      </div>
      {/* ── Row 1: Worker Topology | Alert Summary | Product Health | Account Settings ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Worker Topology */}
        <Panel title="Worker Topology" link="View all" linkHref="/founder/workers">
          <div className="space-y-3">
            {workers.length > 0 ? workers.map((w) => (
              <div key={w.tier} className="flex items-start gap-3">
                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${w.online ? 'bg-severity-success' : 'bg-fg-disabled'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-fg-primary leading-tight">{w.label}</p>
                  <p className="text-[11px] text-fg-muted">{w.description}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded text-nowrap ${
                  w.online ? 'bg-severity-success/15 text-severity-success' : 'bg-elevated text-fg-disabled'
                }`}>{w.online ? 'Online' : 'Offline'}</span>
              </div>
            )) : (
              <p className="text-[12px] text-fg-muted">No worker telemetry yet.</p>
            )}
          </div>
        </Panel>

        {/* Alert Summary */}
        <Panel title="Alert Summary (24h)" link="View all" linkHref="/founder/alerts">
          <AlertDonut p1={tierCounts.p1} p2={tierCounts.p2} p3={tierCounts.p3} p4={tierCounts.p4} />
          {patterns.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <p className="text-[11px] font-semibold text-fg-muted mb-2">Top Failure Patterns</p>
              {patterns.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between items-center text-[11px] py-1">
                  <span className="text-fg-secondary font-mono truncate max-w-[75%]">{p.fingerprint}</span>
                  <span className="text-severity-error font-semibold ml-2">{p.occurrences}x</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Product Health */}
        <Panel title="Product Health" link="View all" linkHref="/founder/products">
          <div className="space-y-2.5">
            {products
              .filter(p => !['incubation_slot_1', 'incubation_slot_2', 'crm', 'language_learning'].includes(p.project_name.toLowerCase()))
              .slice(0, 8)
              .map(p => (
                <div key={p.project_name} className="flex items-center gap-2.5">
                  {p.deployment_health === 'healthy'
                    ? <CheckCircle2 className="h-4 w-4 text-severity-success shrink-0" />
                    : p.deployment_health
                    ? <AlertCircle className="h-4 w-4 text-severity-warn shrink-0" />
                    : <Circle className="h-4 w-4 text-border-strong shrink-0" />
                  }
                  <span className="flex-1 text-[12px] text-fg-secondary capitalize">{p.project_name}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                    p.deployment_health === 'healthy' ? 'text-severity-success bg-severity-success/12 border border-severity-success/20'
                    : p.deployment_health ? 'text-severity-warn bg-severity-warn/12'
                    : 'text-fg-disabled'
                  }`}>
                    {p.deployment_health ?? 'No findings'}
                  </span>
                </div>
              ))}
          </div>
        </Panel>

        {/* Account / Settings panel */}
        <Panel title="Account Settings">
          <div className="space-y-1 mb-4">
            <Link href="/founder/account" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors">
              <span className="flex-1">Manage account &amp; password</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <Link href="/founder/break-glass" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors">
              <span className="flex-1">Recovery secret</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
          <p className="text-[11px] font-semibold text-fg-muted mb-2.5">Settings</p>
          {[
            { label: 'Timezone',           value: 'Asia/Kolkata',  color: 'text-fg-secondary' },
            { label: 'Next Digest',        value: `in ${diffH}h ${diffM}m`, color: 'text-accent' },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-1 text-[11px]">
              <span className="text-fg-muted">{row.label}</span>
              <span className={row.color}>{row.value}</span>
            </div>
          ))}
          <Link href="/founder/account"
                className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-severity-critical/30 py-1.5 text-[12px] font-medium text-severity-critical hover:bg-severity-critical/10 transition-colors">
            Sign Out
          </Link>
        </Panel>
      </div>

      {/* ── Row 2: Recent Activity | Execution Forensics | Orchestration ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Activity */}
        <Panel title="Recent Activity" link="View all activity" linkHref="/founder/tasks">
          <div className="space-y-3">
            {activity.length > 0 ? activity.map(a => {
              const dot = a.severity === 'error' || a.severity === 'critical' ? 'bg-severity-critical'
                        : a.severity === 'success' ? 'bg-severity-success'
                        : a.severity === 'warn' ? 'bg-severity-warn'
                        : 'bg-accent-default'
              return (
                <div key={a.id} className="flex gap-3">
                  <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-fg-primary leading-tight capitalize">{a.label}</p>
                    <p className="text-[11px] text-fg-muted truncate">{a.sub}</p>
                  </div>
                  <span className="text-[10px] text-fg-disabled shrink-0">{relTime(a.created_at)}</span>
                </div>
              )
            }) : (
              <p className="text-[12px] text-fg-muted">No recent activity</p>
            )}
          </div>
        </Panel>

        {/* Execution Forensics */}
        <Panel title="Execution Forensics (Latest)" link="View all" linkHref="/founder/memory">
          {forensic ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] text-fg-muted font-mono">Key: {forensic.key?.slice(0, 30)}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-accent-subtle text-accent">Latest</span>
              </div>
              {[
                ['Project', forensic.project],
                ['Created', relTime(forensic.created_at)],
                ['Value type', Array.isArray(forensic.value) ? 'array' : typeof forensic.value],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border-subtle py-1.5 text-[11px]">
                  <span className="text-fg-muted">{k}</span>
                  <span className="text-fg-secondary font-mono">{v}</span>
                </div>
              ))}
              {typeof forensic.value === 'object' && forensic.value !== null && (
                <div className="mt-3">
                  <p className="text-[10px] text-fg-muted mb-1.5">Value keys</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(forensic.value).slice(0, 6).map(k => (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-accent-subtle text-accent font-mono">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-fg-muted">No execution memory entries.</p>
          )}
        </Panel>

        {/* Orchestration Status */}
        <Panel title="Orchestration Status" link="Configure" linkHref="/founder/workspace">
          <div className="space-y-2.5">
            {providers.slice(0, 8).map(p => {
              const meta = PROVIDER_META[p.provider_name] ?? { label: p.provider_name, color: '#6b7280' }
              return (
                <div key={p.provider_name} className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded flex items-center justify-center shrink-0"
                       style={{ background: meta.color + '22' }}>
                    <Zap className="h-3 w-3" style={{ color: meta.color }} />
                  </div>
                  <span className="flex-1 text-[12px] text-fg-secondary">{meta.label}</span>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${providerDot(p.health_status)}`} />
                  <span className={`text-[11px] min-w-[72px] text-right ${
                    p.health_status === 'ok' ? 'text-severity-success'
                    : p.health_status === 'offline' || p.health_status === 'disabled_billing_required' ? 'text-severity-critical'
                    : 'text-fg-muted'
                  }`}>{providerLabel(p.health_status)}</span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Refresh note */}
      <div className="flex items-center gap-1.5 text-[11px] text-fg-disabled">
        <RefreshCw className="h-3 w-3" />
        <span>Data refreshes every 60s · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
    </div>
  )
}
