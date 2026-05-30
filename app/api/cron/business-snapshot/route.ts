// app/api/cron/business-snapshot/route.ts
// Phase G1 — daily Founder Business Command Center snapshot.
//
// REUSE-ONLY: reads the three account2-readable product DBs and writes ONE row
// into the EXISTING control-plane revenue_snapshots table (source='business_snapshot_v1').
// The overview widget (getBusinessSnapshot) reads that row. No new table, no new DB,
// no new agent. Mirrors the existing cron→snapshot pattern.
//
// DORMANT UNTIL ENV PROVISIONED (founder / Doppler action — cannot be set via MCP):
//   SUPABASE_SCHOOLOS_SERVICE_ROLE_KEY
//   SUPABASE_VIDYAGRID_SERVICE_ROLE_KEY
//   SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY
// Until these exist in the dashboard Vercel env, the route returns {skipped} and
// changes nothing. CONTROL_PLANE_SUPABASE_URL / CONTROL_PLANE_SERVICE_ROLE_KEY already exist.
// Schedule via Vercel cron (vercel.json) once env is set, e.g. "0 1 * * *".

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getControlPlane } from '@/app/lib/control-plane'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PRODUCTS = {
  schoolos:   { projectId: 'rqdnxdvuypekpmxbteju', keyEnv: 'SUPABASE_SCHOOLOS_SERVICE_ROLE_KEY' },
  vidyagrid:  { projectId: 'yfhfzmlrqvyfrdkcbkiy', keyEnv: 'SUPABASE_VIDYAGRID_SERVICE_ROLE_KEY' },
  quickscanz: { projectId: 'yqfwvnrnpydcrzomzdvr', keyEnv: 'SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY' },
} as const

function clientFor(p: { projectId: string; keyEnv: string }) {
  const key = process.env[p.keyEnv]
  if (!key) return null
  return createClient(`https://${p.projectId}.supabase.co`, key, { auth: { persistSession: false } })
}

async function headCount(db: any, table: string, build?: (q: any) => any): Promise<number> {
  try {
    let q = db.from(table).select('*', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count } = await q
    return count ?? 0
  } catch { return 0 }
}

export async function GET(req: Request) {
  // Optional shared-secret gate — enforced only if CRON_SECRET is configured.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const missing: string[] = []
  const products: Record<string, any> = {}
  let collected = 0
  let billed = 0
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  // ── SchoolOS (live) ──
  const so = clientFor(PRODUCTS.schoolos)
  if (!so) missing.push(PRODUCTS.schoolos.keyEnv)
  else {
    const [schools, students, attendance30, staff, alertsOpen, risksOpen] = await Promise.all([
      headCount(so, 'schools'),
      headCount(so, 'students'),
      headCount(so, 'attendance', (q) => q.gte('date', since30)),
      headCount(so, 'school_users', (q) => q.eq('is_active', true)),
      headCount(so, 'alerts', (q) => q.is('acknowledged_at', null)),
      headCount(so, 'student_risk_flags', (q) => q.is('resolved_at', null)),
    ])
    let feesCollected = 0, feesBilled = 0
    try {
      const { data: feeRows } = await so.from('fees').select('amount, paid_date')
      for (const f of (feeRows || []) as { amount: number | null; paid_date: string | null }[]) {
        feesBilled += Number(f.amount || 0)
        if (f.paid_date) feesCollected += Number(f.amount || 0)
      }
    } catch {}
    collected += feesCollected; billed += feesBilled
    products.schoolos = {
      status: 'live', readable: true,
      schools_total: schools, students, attendance_30d: attendance30,
      fees_collected_inr: feesCollected, fees_billed_inr: feesBilled,
      staff_users_active: staff, alerts_open: alertsOpen, risks_open: risksOpen,
    }
  }

  // ── VidyaGrid (pilot) ──
  const vg = clientFor(PRODUCTS.vidyagrid)
  if (!vg) missing.push(PRODUCTS.vidyagrid.keyEnv)
  else {
    const [users, testSessions, studentEvents, pilots, contentUnits, genomeAlerts] = await Promise.all([
      headCount(vg, 'users'),
      headCount(vg, 'test_sessions'),
      headCount(vg, 'student_events'),
      headCount(vg, 'pilot_agreements'),
      headCount(vg, 'content_units'),
      headCount(vg, 'genome_alerts'),
    ])
    products.vidyagrid = {
      status: 'pilot', readable: true,
      users, test_sessions: testSessions, student_events: studentEvents,
      pilot_agreements: pilots, content_units: contentUnits, genome_alerts: genomeAlerts,
    }
  }

  // ── QuickScanZ (pre-launch) ──
  const qs = clientFor(PRODUCTS.quickscanz)
  if (!qs) missing.push(PRODUCTS.quickscanz.keyEnv)
  else {
    let signups = 0
    try {
      const { data } = await qs.auth.admin.listUsers({ page: 1, perPage: 1000 })
      signups = data?.users?.length ?? 0
    } catch {}
    products.quickscanz = { status: 'pre_launch', readable: true, signups, business_rows: 0 }
  }

  // Account1 products are outside MCP scope — represented as deployment-only.
  products.cart2save = { status: 'out_of_scope', readable: false, note: 'account1 - no DB read; deployment-health only' }
  products.quietkeep = { status: 'out_of_scope', readable: false, note: 'account1 - no DB read; deployment-health only' }

  const readableCount = Object.values(products).filter((p: any) => p.readable).length
  if (readableCount === 0) {
    return NextResponse.json({ skipped: true, reason: 'no product service-role keys configured', missing })
  }

  const payload = {
    version: 1,
    kind: 'founder_business_snapshot',
    generated_by: 'cron_business_snapshot',
    computed_at: new Date().toISOString(),
    products,
    totals: { revenue_collected_inr: collected, revenue_billed_inr: billed },
  }

  try {
    const { error } = await getControlPlane().from('revenue_snapshots').insert({
      source: 'business_snapshot_v1',
      product_name: 'ALL',
      amount_inr: collected,
      period_start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      period_end: new Date().toISOString(),
      raw_payload: payload,
    })
    if (error) return NextResponse.json({ ok: false, error: error.message, missing }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'insert failed', missing }, { status: 500 })
  }

  return NextResponse.json({ ok: true, readableCount, missing, totals: payload.totals })
}
