import { getControlPlane } from '@/app/lib/control-plane'

// Product Readiness Center data layer (read-only). Reuses existing control-plane
// tables: outcome_checks (per-product intended outcomes + status) and
// deployment_verifications (latest deploy state). No new tables.

export type ProductReadiness = {
  product: string
  total: number
  pass: number
  degraded: number
  fail: number
  unverified: number
  readinessPct: number       // pass / total
  validationPct: number      // (total - unverified) / total
  rejectionRiskPct: number   // heuristic from fail/degraded/unverified
  criticalFailures: number
  latestDeploy: string | null
  languageCoverage: string
}

// Mirrors @pranix/i18n fill_status (no DB source yet): en complete; 5 Indic locales machine-draft.
const LANGUAGE_COVERAGE = 'EN ✓ · HI/TE/TA/KN/ML draft'

export async function getReadiness(): Promise<ProductReadiness[]> {
  const db = getControlPlane()
  const [ocRes, depRes] = await Promise.all([
    db.from('outcome_checks').select('product, status'),
    db.from('deployment_verifications').select('project_name, final_state, completed_at').order('completed_at', { ascending: false }),
  ])

  const checks = (ocRes.data ?? []) as Array<{ product: string; status: string }>
  const deps = (depRes.data ?? []) as Array<{ project_name: string | null; final_state: string | null }>

  const latestDeploy = new Map<string, string | null>()
  for (const d of deps) {
    if (d.project_name && !latestDeploy.has(d.project_name)) latestDeploy.set(d.project_name, d.final_state)
  }

  type Acc = { pass: number; degraded: number; fail: number; unverified: number; total: number }
  const acc = new Map<string, Acc>()
  for (const c of checks) {
    const a = acc.get(c.product) ?? { pass: 0, degraded: 0, fail: 0, unverified: 0, total: 0 }
    a.total += 1
    if (c.status === 'pass') a.pass += 1
    else if (c.status === 'degraded') a.degraded += 1
    else if (c.status === 'fail') a.fail += 1
    else a.unverified += 1
    acc.set(c.product, a)
  }

  const out: ProductReadiness[] = []
  for (const [product, a] of Array.from(acc.entries())) {
    const verified = a.total - a.unverified
    const pct = (n: number) => (a.total ? Math.round((n / a.total) * 100) : 0)
    out.push({
      product,
      total: a.total,
      pass: a.pass, degraded: a.degraded, fail: a.fail, unverified: a.unverified,
      readinessPct: pct(a.pass),
      validationPct: pct(verified),
      rejectionRiskPct: Math.min(100, Math.round(((a.fail + 0.5 * a.degraded + 0.25 * a.unverified) / (a.total || 1)) * 100)),
      criticalFailures: a.fail,
      latestDeploy: latestDeploy.get(product) ?? null,
      languageCoverage: LANGUAGE_COVERAGE,
    })
  }
  out.sort((x, y) => x.product.localeCompare(y.product))
  return out
}

// Platform-wide activation signals (read-only). Reuses existing control-plane
// tables only: outcome_checks (validation), mcp_intakes (stakeholder issues +
// founder visibility), tasks (LoveBot responses), pranix_memory (LoveBot
// escalations). No new tables, no new storage.
export type PlatformSignals = {
  outcomeTotal: number
  outcomeValidated: number
  outcomePass: number
  outcomeCoveragePct: number   // validated / total
  outcomePassPct: number       // pass / total
  criticalFailures: number     // outcome_checks fail
  issuesTotal: number          // mcp_intakes all-time
  issuesRecent: number         // mcp_intakes last 7 days
  lovebotInvocations: number   // = lovebotResponses (kept for back-compat)
  lovebotResponses: number     // tasks lovebot_answer completed
  lovebotEscalations: number   // pranix_memory source_kind=lovebot_escalation
  escalationRatePct: number    // escalations / responses
  issueTrend7d: number[]       // daily mcp_intakes counts, oldest->newest (len 7)
  escalationTrend7d: number[]  // daily escalation counts, oldest->newest (len 7)
}

// Bucket ISO timestamps into 7 daily counts (UTC), index 0 = 6 days ago, index 6 = today.
function bucket7d(timestamps: string[]): number[] {
  const days = 7
  const now = new Date()
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const counts = new Array(days).fill(0)
  for (const ts of timestamps) {
    const t = new Date(ts)
    const dayUtc = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())
    const diffDays = Math.floor((startOfTodayUtc - dayUtc) / 86400000)
    if (diffDays >= 0 && diffDays < days) counts[days - 1 - diffDays] += 1
  }
  return counts
}

export async function getPlatformSignals(): Promise<PlatformSignals> {
  const db = getControlPlane()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [ocRes, intakesAll, intakesRecent, lovebot, escal, intakeDates, escalDates] = await Promise.all([
    db.from('outcome_checks').select('status'),
    db.from('mcp_intakes').select('id', { count: 'exact', head: true }),
    db.from('mcp_intakes').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('action', 'lovebot_answer').eq('state', 'completed'),
    db.from('pranix_memory').select('id', { count: 'exact', head: true }).eq('source_kind', 'lovebot_escalation'),
    db.from('mcp_intakes').select('created_at').gte('created_at', sevenDaysAgo),
    db.from('pranix_memory').select('created_at').eq('source_kind', 'lovebot_escalation').gte('created_at', sevenDaysAgo),
  ])

  const checks = (ocRes.data ?? []) as Array<{ status: string }>
  const outcomeTotal = checks.length
  const outcomePass = checks.filter((c) => c.status === 'pass').length
  const criticalFailures = checks.filter((c) => c.status === 'fail').length
  const outcomeValidated = checks.filter((c) => c.status !== 'unverified').length
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

  const responses = lovebot.count ?? 0
  const escalations = escal.count ?? 0
  const intakeTimes = ((intakeDates.data ?? []) as Array<{ created_at: string }>).map((r) => r.created_at)
  const escalTimes = ((escalDates.data ?? []) as Array<{ created_at: string }>).map((r) => r.created_at)

  return {
    outcomeTotal,
    outcomeValidated,
    outcomePass,
    outcomeCoveragePct: pct(outcomeValidated, outcomeTotal),
    outcomePassPct: pct(outcomePass, outcomeTotal),
    criticalFailures,
    issuesTotal: intakesAll.count ?? 0,
    issuesRecent: intakesRecent.count ?? 0,
    lovebotInvocations: responses,
    lovebotResponses: responses,
    lovebotEscalations: escalations,
    escalationRatePct: pct(escalations, responses),
    issueTrend7d: bucket7d(intakeTimes),
    escalationTrend7d: bucket7d(escalTimes),
  }
}
