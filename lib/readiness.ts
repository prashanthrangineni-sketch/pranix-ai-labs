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
  for (const [product, a] of acc) {
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
