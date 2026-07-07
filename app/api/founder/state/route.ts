import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'

export const dynamic    = 'force-dynamic'
export const maxDuration = 20

const PROJECT   = 'pranix-dashboard'
const TTL_HOURS = 168   // default 7-day TTL for all tracked state

// ─── Types ──────────────────────────────────────────────────────────────────────────

export type StateHealthStatus = 'healthy' | 'warning' | 'critical' | 'expired'

export type StateCategory =
  | 'operations'
  | 'schedules'
  | 'governance'
  | 'authority'
  | 'founder_mode'
  | 'autonomy'

export interface StateRecord {
  key:                  string
  label:                string
  category:             StateCategory
  created_at:           string
  expires_at:           string
  ttl_hours:            number
  health_status:        StateHealthStatus
  hours_remaining:      number      // negative = already expired
  refresh_recommended:  boolean
  // raw value preview (non-sensitive summary only)
  preview?:             string
}

export interface StateSummary {
  healthy:  number
  warning:  number
  critical: number
  expired:  number
}

// ─── Catalog: which execution_memory keys to track ────────────────────────────────────────
//
// Each entry is a key prefix (without project filter) and its display label.
// We match by prefix so we pick up all keys in that category (e.g. every
// p6:operation:<id> key). Non-prefixed entries match exact keys only.

interface CatalogEntry {
  prefix:   string
  label:    string
  category: StateCategory
}

const STATE_CATALOG: CatalogEntry[] = [
  { prefix: 'p6:operation:',   label: 'Operation',          category: 'operations'   },
  { prefix: 'p7:schedule:',    label: 'Schedule',           category: 'schedules'    },
  { prefix: 'p8:governance:',  label: 'Governance Override',category: 'governance'   },
  { prefix: 'p8:policy:',      label: 'Policy Override',    category: 'governance'   },
  { prefix: 'p10:authority:',  label: 'Authority Grant',    category: 'authority'    },
  { prefix: 'p9:mode',         label: 'Founder Mode',       category: 'founder_mode' },
  { prefix: 'p13:autonomy',    label: 'Autonomy State',     category: 'autonomy'     },
  { prefix: 'p12:learning:',   label: 'Learning Signal',    category: 'autonomy'     },
  { prefix: 'p11:execution:',  label: 'Execution Record',   category: 'operations'   },
  // ask: tasks fall into operations category for state-health purposes
  { prefix: 'ask:task:',       label: 'Task Snapshot',      category: 'operations'   },
]

// ─── Health classification ───────────────────────────────────────────────────────────────────

function classifyHealth(hoursRemaining: number): StateHealthStatus {
  if (hoursRemaining <= 0)   return 'expired'
  if (hoursRemaining <= 2)   return 'critical'
  if (hoursRemaining <= 24)  return 'warning'
  return 'healthy'
}

// ─── Auth gate ───────────────────────────────────────────────────────────────────────────

async function assertFounder(): Promise<{ ok: boolean }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return data ? { ok: true } : { ok: false }
  } catch { return { ok: false } }
}

// ─── Build state record from a raw execution_memory row ──────────────────────────────────

function buildRecord(
  row:     { key: string; value: unknown; created_at: string; expires_at: string | null },
  catalog: CatalogEntry,
): StateRecord {
  const now           = Date.now()
  const expiresAt     = row.expires_at
    ? new Date(row.expires_at)
    : new Date(now + TTL_HOURS * 3_600_000)  // no expiry = assume default TTL
  const createdAt     = new Date(row.created_at)
  const hoursRemaining = (expiresAt.getTime() - now) / 3_600_000
  const ttlTotal      = (expiresAt.getTime() - createdAt.getTime()) / 3_600_000
  const health        = classifyHealth(hoursRemaining)

  // Build a non-sensitive preview from the value
  let preview: string | undefined
  if (typeof row.value === 'object' && row.value !== null) {
    const v = row.value as Record<string, unknown>
    // Try common title/name fields
    const title = v.title ?? v.name ?? v.operation_title ?? v.goal ?? v.mode_id ?? v.status
    if (typeof title === 'string') preview = title.slice(0, 80)
  }

  return {
    key:                 row.key,
    label:               catalog.label,
    category:            catalog.category,
    created_at:          createdAt.toISOString(),
    expires_at:          expiresAt.toISOString(),
    ttl_hours:           Math.round(ttlTotal),
    health_status:       health,
    hours_remaining:     Math.round(hoursRemaining * 10) / 10,
    refresh_recommended: health === 'critical' || health === 'expired',
    preview,
  }
}

// ─── Scan execution_memory for all tracked keys ────────────────────────────────────────────

async function scanState(): Promise<StateRecord[]> {
  const cp = getControlPlane()
  const records: StateRecord[] = []

  // Scan each catalog prefix in parallel — cap at 20 rows per prefix to avoid bloat
  await Promise.all(
    STATE_CATALOG.map(async (entry) => {
      try {
        const { data } = await cp
          .from('execution_memory')
          .select('key, value, created_at, expires_at')
          .eq('project', PROJECT)
          .like('key', `${entry.prefix}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (!data) return
        for (const row of data) {
          records.push(buildRecord(row as { key: string; value: unknown; created_at: string; expires_at: string | null }, entry))
        }
      } catch { /* skip failing prefix */ }
    })
  )

  // De-duplicate by key (if a key matches multiple prefixes, keep first)
  const seen = new Set<string>()
  return records.filter(r => {
    if (seen.has(r.key)) return false
    seen.add(r.key)
    return true
  })
}

// ─── Summarise ───────────────────────────────────────────────────────────────────────────

function summarise(records: StateRecord[]): StateSummary {
  return {
    healthy:  records.filter(r => r.health_status === 'healthy').length,
    warning:  records.filter(r => r.health_status === 'warning').length,
    critical: records.filter(r => r.health_status === 'critical').length,
    expired:  records.filter(r => r.health_status === 'expired').length,
  }
}

// ─── Sort records: critical → warning → healthy → expired ────────────────────────────────────

const HEALTH_ORDER: Record<StateHealthStatus, number> = {
  critical: 0,
  warning:  1,
  healthy:  2,
  expired:  3,
}

function sortRecords(records: StateRecord[]): StateRecord[] {
  return [...records].sort((a, b) => {
    const hDiff = HEALTH_ORDER[a.health_status] - HEALTH_ORDER[b.health_status]
    if (hDiff !== 0) return hDiff
    // Within same health tier: sort by hours_remaining ascending (most urgent first)
    return a.hours_remaining - b.hours_remaining
  })
}

// ─── Refresh: extend TTL by default amount ─────────────────────────────────────────────────

async function refreshKey(key: string): Promise<{ ok: boolean; new_expires_at: string }> {
  const newExpiry = new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString()
  const cp = getControlPlane()

  // Read current value first (preserve it)
  const { data } = await cp
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', key)
    .maybeSingle()

  if (!data) return { ok: false, new_expires_at: newExpiry }

  await cp
    .from('execution_memory')
    .upsert(
      {
        project:    PROJECT,
        key,
        value:      data.value,
        expires_at: newExpiry,
      },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )

  return { ok: true, new_expires_at: newExpiry }
}

async function refreshCategory(category: StateCategory): Promise<number> {
  const records = await scanState()
  const targets = records.filter(r => r.category === category)
  let refreshed = 0
  for (const rec of targets) {
    const { ok } = await refreshKey(rec.key)
    if (ok) refreshed++
  }
  return refreshed
}

// ─── GET /api/founder/state ───────────────────────────────────────────────────────────────────

export async function GET() {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const raw     = await scanState()
  const sorted  = sortRecords(raw)
  const summary = summarise(sorted)

  return NextResponse.json({
    summary,
    records: sorted,
    scanned_at: new Date().toISOString(),
  })
}

// ─── POST /api/founder/state ───────────────────────────────────────────────────────────────────
//
// Actions:
//   refresh_state    — refresh a single key by its exact execution_memory key
//   refresh_category — refresh all keys in a given category
//
// Both extend TTL by TTL_HOURS (7 days). Only writes expires_at.
// No GitHub, Supabase schema, Vercel, or Doppler writes.

export async function POST(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'refresh_state') {
    const key = typeof body.key === 'string' ? body.key.trim() : ''
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
    const result = await refreshKey(key)
    if (!result.ok) return NextResponse.json({ error: 'key_not_found' }, { status: 404 })
    return NextResponse.json({ ok: true, action, key, new_expires_at: result.new_expires_at })
  }

  if (action === 'refresh_category') {
    const category = typeof body.category === 'string' ? body.category as StateCategory : null
    if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })
    const count = await refreshCategory(category)
    return NextResponse.json({ ok: true, action, category, refreshed_count: count })
  }

  return NextResponse.json({ error: `unknown_action: ${action}` }, { status: 400 })
}
