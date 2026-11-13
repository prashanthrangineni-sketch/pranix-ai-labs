// Visual-check baselines: which screenshots need the founder's attention, and which may be approved.
// Pure functions, no database access (used by lib/queries.ts and app/founder/baselines/actions.ts).
//
// Claim #4 part 2 (13 Nov 2026). The page used to list the 50 newest review/fail rows, so every run
// of the same check added another card (3 runs = 24 cards for 8 pages), month-old failures sat at the
// top, recordings and failure captures could be approved as "baselines".

export const REVIEW_WINDOW_DAYS = 7

export type ArtifactRow = {
  id: string
  project_name: string
  check_name: string
  viewport: string
  status: string
  diff_score: number | null
  storage_path: string | null
  created_at: string
  metadata_json: Record<string, unknown> | null
}

const IMAGE = /\.(png|jpe?g|webp)$/i

export function isImagePath(p: string | null | undefined): boolean {
  return !!p && IMAGE.test(p) && !/\.diff\.png$/i.test(p)
}

/** Failure captures, automatic homepage shots and recordings are never baselines (mirrors the engine's rule). */
export function isBaselineEligible(checkName: string, storagePath: string | null | undefined): boolean {
  if (!checkName || /^failure_step_/.test(checkName) || /^auto_/.test(checkName)) return false
  return isImagePath(storagePath)
}

export function checkKey(r: Pick<ArtifactRow, 'project_name' | 'check_name' | 'viewport'>): string {
  return `${r.project_name}\u0000${r.check_name}\u0000${r.viewport}`
}

/**
 * One row per check (project + check + viewport): the newest. It is kept only if that newest run
 * still needs attention (review or fail). An approved or passing newest run hides the older ones.
 * Failure captures are left out entirely. Result: newest first.
 */
export function currentOpenChecks<T extends ArtifactRow>(rows: T[]): T[] {
  const newest = new Map<string, T>()
  for (const r of rows) {
    if (/^failure_step_/.test(r.check_name)) continue
    const k = checkKey(r)
    const cur = newest.get(k)
    if (!cur || r.created_at > cur.created_at) newest.set(k, r)
  }
  return [...newest.values()]
    .filter(r => r.status === 'review' || r.status === 'fail')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

/** Paths of the approved and difference pictures, when the run was compared against a baseline. */
export function comparisonPaths(meta: Record<string, unknown> | null): { baseline: string | null; diff: string | null; reason: string | null } {
  const s = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return { baseline: s(meta?.baseline_path), diff: s(meta?.diff_path), reason: s(meta?.reason) }
}
