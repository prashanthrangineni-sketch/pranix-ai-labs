// app/api/cron/drift-brief/route.ts
// Weekly drift brief — compares each product charter's "LIVE-VERIFIED STATE"
// claims (content/charters/*.md) against the live control-plane outcome_checks
// table, and writes ONE deduped P2 alert to founder_alerts if anything has
// drifted since the charter was last hand-verified.
//
// Triggered externally (GitHub Actions weekly schedule + CRON_SECRET bearer),
// NOT via Vercel cron — Vercel Hobby cron is once-daily max (Playbook rule #5),
// and this only needs to run weekly. See .github/workflows/weekly-drift-brief.yml.
//
// Read-only against outcome_checks; the only write is the single dedup-guarded
// founder_alerts insert below.

import { NextResponse } from 'next/server'
import { getControlPlane } from '@/app/lib/control-plane'
import { getCharters, extractClaimedOutcomes } from '@/lib/charters'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Drift {
  product: string
  outcome: string
  claimed: string
  live: string | null // null = outcome not found at all in the live table
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const db = getControlPlane()
  const charters = getCharters()
  const drifts: Drift[] = []

  for (const charter of charters) {
    const claims = extractClaimedOutcomes(charter.liveVerified)
    if (claims.length === 0) continue

    const { data: liveRows, error } = await db
      .from('outcome_checks')
      .select('outcome, status')
      .eq('product', charter.productKey)

    if (error) {
      // Can't read this product's live rows — skip rather than false-positive.
      continue
    }

    const liveByOutcome = new Map<string, string>()
    for (const row of liveRows ?? []) {
      liveByOutcome.set(String(row.outcome).toLowerCase(), String(row.status).toUpperCase())
    }

    for (const claim of claims) {
      const live = liveByOutcome.get(claim.outcome) ?? null
      const claimedNormalized = claim.status === 'FAILED' ? 'FAIL' : claim.status
      const liveNormalized = live === 'FAILED' ? 'FAIL' : live
      if (liveNormalized !== claimedNormalized) {
        drifts.push({
          product: charter.productKey,
          outcome: claim.outcome,
          claimed: claim.status,
          live: live,
        })
      }
    }
  }

  if (drifts.length === 0) {
    return NextResponse.json({ ok: true, drifts: 0 })
  }

  // Dedup: don't re-alert every week if last week's drift alert is still
  // unacknowledged — check for an open charter_drift alert first.
  const { data: existing } = await db
    .from('founder_alerts')
    .select('id')
    .eq('alert_type', 'charter_drift')
    .eq('acknowledged', false)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, drifts: drifts.length, skipped: 'unacknowledged alert already open' })
  }

  const body = drifts
    .map((d) => `${d.product}/${d.outcome}: charter says ${d.claimed}, live outcome_checks says ${d.live ?? 'NO ROW FOUND'}`)
    .join('\n')

  const { error: insertError } = await db.from('founder_alerts').insert({
    level: 'warn',
    source: 'weekly-drift-brief',
    title: `Charter drift: ${drifts.length} claim${drifts.length === 1 ? '' : 's'} out of sync with live outcome_checks`,
    body,
    alert_type: 'charter_drift',
    severity_tier: 'P2',
    delivered: false,
    acknowledged: false,
  })

  if (insertError) {
    return NextResponse.json({ ok: false, drifts: drifts.length, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, drifts: drifts.length, alerted: true })
}
