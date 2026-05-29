import { getControlPlane } from '@/app/lib/control-plane'

// Phase D — Artifact Governance read layer.
// Reads the single canonical artifact_registry via the service-role control plane
// (bypasses RLS; the /founder shell is founder-gated by middleware regardless).

export type ArtifactRow = {
  id: string
  kind: string
  title: string
  category: string | null
  status: string
  origin: string
  source_table: string | null
  retention: string
  row_count: number | null
  founder_reviewed: boolean
  created_at: string
}

export type KindSummary = { kind: string; entries: number; rows: number }

export type ArtifactGovernance = {
  totalEntries: number
  canonical: ArtifactRow[]
  archived: ArtifactRow[]
  byKind: KindSummary[]
  purgeableTables: number
  purgeableRows: number
  legalHold: number
}

const COLS =
  'id, kind, title, category, status, origin, source_table, retention, row_count, founder_reviewed, created_at'

export async function getArtifactGovernance(): Promise<ArtifactGovernance> {
  const db = getControlPlane()
  const { data, error } = await db
    .from('artifact_registry')
    .select(COLS)
    .order('status', { ascending: true })
    .order('row_count', { ascending: false, nullsFirst: false })

  if (error || !data) {
    return {
      totalEntries: 0, canonical: [], archived: [], byKind: [],
      purgeableTables: 0, purgeableRows: 0, legalHold: 0,
    }
  }

  const rows = data as ArtifactRow[]
  const canonical = rows.filter((r) => r.status === 'canonical' || r.status === 'active')
  const archived = rows.filter((r) => r.status === 'archived' || r.status === 'superseded')

  const byKindMap = new Map<string, KindSummary>()
  for (const r of rows) {
    const e = byKindMap.get(r.kind) ?? { kind: r.kind, entries: 0, rows: 0 }
    e.entries += 1
    e.rows += r.row_count ?? 0
    byKindMap.set(r.kind, e)
  }
  const byKind = [...byKindMap.values()].sort((a, b) => b.entries - a.entries)

  const purgeable = rows.filter((r) => r.retention === 'purgeable')
  const legalHold = rows.filter((r) => r.retention === 'legal_hold').length

  return {
    totalEntries: rows.length,
    canonical,
    archived,
    byKind,
    purgeableTables: purgeable.length,
    purgeableRows: purgeable.reduce((s, r) => s + (r.row_count ?? 0), 0),
    legalHold,
  }
}
