// app/api/cron/business-snapshot/route.ts
// Phase G1 — daily Founder Business Command Center snapshot.
//
// REUSE-ONLY: reads the three account2-readable product DBs and writes ONE row
// into the EXISTING control-plane revenue_snapshots table (source='business_snapshot_v1').
// The overview widget (getBusinessSnapshot) reads that row. No new table, no new DB,
// no new agent. Mirrors the existing cron→snapshot pattern.
//
// Phase H (Path A) — Cart2Save + QuietKeep are read via the control-plane
// `dashboard-readonly` edge function. That function holds the account1 service-role
// keys; THIS runtime never sees them. It returns AGGREGATE COUNTS ONLY (no rows, no PII).
// No account1 service-role keys are added to this project's environment.
//
// DORMANT UNTIL ENV PROVISIONED (founder / Doppler action — cannot be set via MCP):
//   SUPABASE_SCHOOLOS_SERVICE_ROLE_KEY
//   SUPABASE_VIDYAGRID_SERVICE_ROLE_KEY
//   SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY
// Until these exist in the dashboard Vercel env, the route returns {skipped} and
// changes nothing. CONTROL_PLANE_SUPABASE_URL / CONTROL_PLANE_SERVICE_ROLE_KEY already exist
// and are also used to invoke the dashboard-readonly edge function.
// Schedule via Vercel cron (vercel.json) once env is set, e.g. "0 1 * * *".

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getControlPlane } from '@/app/lib/control-plane'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// Give the daily run room; a slow product read must never stop the snapshot from being written.
export const maxDuration = 60

// Per-product read budget. A product that does not answer in time is recorded as
// unreadable (with the reason) instead of being counted as zero.
const PRODUCT_TIMEOUT_MS = 15000

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${PRODUCT_TIMEOUT_MS / 1000}s`)), PRODUCT_TIMEOUT_MS)),
  ])
}

const PRODUCTS = {
  schoolos:   { projectId: 'rqdnxdvuypekpmxbteju', keyEnv: 'SUPABASE_SCHOOLOS_SERVICE_ROLE_KEY' },
  vidyagrid:  { projectId: 'yfhfzmlrqvyfrdkcbkiy', keyEnv: 'SUPABASE_VIDYAGRID_SERVICE_ROLE_KEY' },
  quickscanz: { projectId: 'yqfwvnrnpydcrzomzdvr', keyEnv: 'SUPABASE_QUICKSCANZ_SERVICE_ROLE_KEY' },
} as const

// Account1 products — read via the control-plane `dashboard-readonly` edge function.
// The function holds the account1 service-role keys; this runtime never receives them.
const READONLY_PRODUCTS = {
  cart2save: { projectId: 'augeusvhqcqemfeqximk' },
  quietkeep: { projectId: 'ofnhwpzzxthdvvunxsfs' },
} as const

function clientFor(p: { projectId: string; keyEnv: string }) {
  const key = process.env[p.keyEnv]
  if (!key) return null
  return createClient(`https://${p.projectId}.supabase.co`, key, { auth: { persistSession: false } })
}

// Counts rows. A read error is RECORDED in `errs` (never silently turned into 0),
// so a failed read can be told apart from a real empty table.
async function headCount(db: any, table: string, errs: string[], build?: (q: any) => any): Promise<number> {
  try {
    let q = db.from(table).select('*', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count, error } = await q
    if (error) { errs.push(`${table}: ${error.message || error.code || 'read error'}`); return 0 }
    return count ?? 0
  } catch (e: any) {
    errs.push(`${table}: ${e?.message ?? 'read error'}`)
    return 0
  }
}

// ── Path A: aggregate-count fetch via the read-only `dashboard-readonly` edge function ──
// Returns ONLY integer counts keyed by table name. Never returns rows or PII.
// Defensive against response shape: accepts { counts: {t:n} }, top-level { t:n },
// or an array of { table|name|table_name, count|n|rows }.
function normalizeCounts(data: any, tables: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  const obj = data?.counts ?? data?.data?.counts ?? (Array.isArray(data) ? null : data)
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const t of tables) out[t] = Number(obj[t] ?? 0)
    return out
  }
  const arr = Array.isArray(data) ? data : (data?.results ?? data?.tables)
  if (Array.isArray(arr)) {
    const m = new Map<string, number>()
    for (const r of arr) {
      const name = r?.table ?? r?.name ?? r?.table_name
      if (name != null) m.set(String(name), Number(r?.count ?? r?.n ?? r?.rows ?? 0))
    }
    for (const t of tables) out[t] = m.get(t) ?? 0
    return out
  }
  for (const t of tables) out[t] = 0
  return out
}

async function readonlyCounts(projectId: string, tables: string[]): Promise<Record<string, number> | null> {
  try {
    const { data, error } = await withTimeout(getControlPlane().functions.invoke('dashboard-readonly', {
      body: { project_id: projectId, mode: 'counts', tables },
    }), `dashboard-readonly ${projectId}`)
    if (error || data == null) return null
    return normalizeCounts(data, tables)
  } catch { return null }
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
  const unreadable: string[] = []
  const so = clientFor(PRODUCTS.schoolos)
  if (!so) missing.push(PRODUCTS.schoolos.keyEnv)
  else {
    const errs: string[] = []
    try {
      await withTimeout((async () => {
        const [schools, students, attendance30, staff, alertsOpen, risksOpen] = await Promise.all([
          headCount(so, 'schools', errs),
          headCount(so, 'students', errs),
          headCount(so, 'attendance', errs, (q) => q.gte('date', since30)),
          headCount(so, 'school_users', errs, (q) => q.eq('is_active', true)),
          headCount(so, 'alerts', errs, (q) => q.is('acknowledged_at', null)),
          headCount(so, 'student_risk_flags', errs, (q) => q.is('resolved_at', null)),
        ])
        let feesCollected = 0, feesBilled = 0
        const { data: feeRows, error: feeErr } = await so.from('fees').select('amount, paid_date').range(0, 9999)
        if (feeErr) errs.push(`fees: ${feeErr.message || feeErr.code || 'read error'}`)
        for (const f of (feeRows || []) as { amount: number | null; paid_date: string | null }[]) {
          feesBilled += Number(f.amount || 0)
          if (f.paid_date) feesCollected += Number(f.amount || 0)
        }
        if (errs.length === 0) {
          collected += feesCollected; billed += feesBilled
          products.schoolos = {
            status: 'live', readable: true,
            schools_total: schools, students, attendance_30d: attendance30,
            fees_collected_inr: feesCollected, fees_billed_inr: feesBilled,
            staff_users_active: staff, alerts_open: alertsOpen, risks_open: risksOpen,
          }
        }
      })(), 'schoolos')
    } catch (e: any) {
      errs.push(e?.message ?? 'schoolos read failed')
    }
    if (errs.length > 0) {
      unreadable.push('schoolos')
      products.schoolos = { status: 'read_failed', readable: false, errors: errs.slice(0, 5) }
    }
  }

  // ── VidyaGrid (pilot) ──
  const vg = clientFor(PRODUCTS.vidyagrid)
  if (!vg) missing.push(PRODUCTS.vidyagrid.keyEnv)
  else {
    const errs: string[] = []
    try {
      const [users, testSessions, studentEvents, pilots, contentUnits, genomeAlerts] = await withTimeout(Promise.all([
        headCount(vg, 'users', errs),
        headCount(vg, 'test_sessions', errs),
        headCount(vg, 'student_events', errs),
        headCount(vg, 'pilot_agreements', errs),
        headCount(vg, 'content_units', errs),
        headCount(vg, 'genome_alerts', errs),
      ]), 'vidyagrid')
      if (errs.length === 0) products.vidyagrid = {
        status: 'pilot', readable: true,
        users, test_sessions: testSessions, student_events: studentEvents,
        pilot_agreements: pilots, content_units: contentUnits, genome_alerts: genomeAlerts,
      }
    } catch (e: any) { errs.push(e?.message ?? 'vidyagrid read failed') }
    if (errs.length > 0) {
      unreadable.push('vidyagrid')
      products.vidyagrid = { status: 'read_failed', readable: false, errors: errs.slice(0, 5) }
    }
  }

  // ── QuickScanZ (pre-launch) ──
  const qs = clientFor(PRODUCTS.quickscanz)
  if (!qs) missing.push(PRODUCTS.quickscanz.keyEnv)
  else {
    try {
      const { data, error } = await withTimeout(qs.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'quickscanz')
      if (error) throw new Error(`auth users: ${error.message}`)
      products.quickscanz = { status: 'pre_launch', readable: true, signups: data?.users?.length ?? 0, business_rows: 0 }
    } catch (e: any) {
      unreadable.push('quickscanz')
      products.quickscanz = { status: 'read_failed', readable: false, errors: [e?.message ?? 'read failed'] }
    }
  }

  // ── Cart2Save (account1, pre-revenue) — via read-only dashboard-readonly function ──
  // Aggregate counts only. No account1 key in this runtime; no rows; no PII.
  {
    const tables = [
      'users', 'orders', 'order_items', 'payments', 'revenue_ledger', 'cashback_events',
      'click_events', 'affiliate_clicks', 'search_events', 'settlement_ledger', 'merchants', 'watchlists',
    ]
    const c = await readonlyCounts(READONLY_PRODUCTS.cart2save.projectId, tables)
    if (!c) {
      unreadable.push('cart2save')
      products.cart2save = { status: 'unavailable', readable: false, note: 'dashboard-readonly fetch failed' }
    } else {
      const revenueRows = (c.payments ?? 0) + (c.revenue_ledger ?? 0) + (c.cashback_events ?? 0)
      const activityTotal = (c.affiliate_clicks ?? 0) + (c.click_events ?? 0)
      products.cart2save = {
        status: 'pre_revenue', readable: true, source: 'dashboard-readonly',
        users: c.users,
        orders: c.orders,
        order_items: c.order_items,
        affiliate_clicks: c.affiliate_clicks,
        site_clicks: c.click_events,
        searches: c.search_events,
        merchants: c.merchants,
        watchlists: c.watchlists,
        settlements: c.settlement_ledger,
        revenue_rows: revenueRows,
        activity_label: `${c.orders ?? 0} orders \u00b7 ${c.affiliate_clicks ?? 0} aff. clicks`,
        revenue_label: revenueRows === 0 ? 'Instrumented \u2014 awaiting first transactions' : 'Revenue flowing',
        instrumentation_note: activityTotal > 0 ? 'Order & click capture active' : 'No activity captured yet',
      }
    }
  }

  // ── QuietKeep (account1, beta) — via read-only dashboard-readonly function ──
  {
    const tables = [
      'profiles', 'keeps', 'reminders', 'subscriptions', 'device_tokens', 'family_members',
      'intent_events', 'daily_usage', 'usage_logs', 'voice_sessions', 'voice_samples', 'conversation_sessions',
    ]
    const c = await readonlyCounts(READONLY_PRODUCTS.quietkeep.projectId, tables)
    if (!c) {
      unreadable.push('quietkeep')
      products.quietkeep = { status: 'unavailable', readable: false, note: 'dashboard-readonly fetch failed' }
    } else {
      const voiceRows = (c.voice_sessions ?? 0) + (c.voice_samples ?? 0)
      products.quietkeep = {
        status: 'beta', readable: true, source: 'dashboard-readonly',
        users: c.profiles,
        keeps: c.keeps,
        subscriptions: c.subscriptions,
        reminders_active: c.reminders,
        devices: c.device_tokens,
        family_links: c.family_members,
        intent_events: c.intent_events,
        daily_usage_rows: c.daily_usage,
        voice_sessions: c.voice_sessions,
        voice_samples: c.voice_samples,
        activity_label: `${c.keeps ?? 0} keeps \u00b7 ${c.intent_events ?? 0} intents`,
        revenue_label: `${c.subscriptions ?? 0} active subscriptions`,
        instrumentation_note: voiceRows === 0 ? 'Voice instrumentation not yet active' : 'Voice logging active',
      }
    }
  }

  // Always write the row, even when nothing could be read: a row that says what failed
  // is the evidence; no row at all (as on 30-31 Oct 2026) tells nobody anything.
  const readableCount = Object.values(products).filter((p: any) => p.readable).length

  const payload = {
    version: 1,
    kind: 'founder_business_snapshot',
    generated_by: 'cron_business_snapshot',
    computed_at: new Date().toISOString(),
    products,
    // partial=true means at least one product could not be read: its numbers are NOT in
    // these totals, so a reader must not treat a fall in the totals as real money movement.
    totals: { revenue_collected_inr: collected, revenue_billed_inr: billed, partial: unreadable.length > 0, unreadable },
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

  return NextResponse.json({ ok: true, readableCount, missing, unreadable, totals: payload.totals })
}
