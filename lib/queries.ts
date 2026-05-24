import { createServerClient } from './supabase'

// ─── Types ───────────────────────────────────────────────────────

export type TaskCounts = {
  completed: number
  dead: number
  pending: number
  cancelled: number
}

export type AlertCounts = {
  critical: number
  error: number
  warn: number
  info: number
}

export type FailurePattern = {
  id: string
  fingerprint: string
  product_name: string | null
  failure_type: string
  occurrences: number
  first_seen_at: string
  last_seen_at: string
  status: string
}

export type ProductHealth = {
  project_name: string
  url: string | null
  account_tier: string
  open_findings: number
  last_audit_at: string | null
  product_type: string
  github_repo: string | null
  vercel_project_id: string | null
  supabase_project_id: string | null
  deployment_health: string | null
}

export type WorkerRun = {
  id: string
  started_at: string
  completed_at: string | null
  tasks_processed: number
  tasks_failed: number
  status: string
  locked_by: string | null
}

export type MemoryEntry = {
  id: string
  project: string
  key: string
  value: any
  created_at: string
  expires_at: string | null
}

export type PendingGrant = {
  id: string
  scope: string
  resource_pattern: string
  requested_task: string
  expires_at: string
  created_at: string
}

export type DigestEntry = {
  id: string
  digest_date: string
  digest_content: any
  created_at: string
}

// ─── Queries ─────────────────────────────────────────────────────

/**
 * Task counts using exact count queries per state.
 * Previous approach fetched all rows (.select('state')) which hit Supabase's
 * 1,000-row default limit, undercounting on tables with 3,500+ rows.
 */
export async function getTaskCounts(): Promise<TaskCounts> {
  const db = createServerClient()
  const states = ['completed', 'dead', 'pending', 'cancelled'] as const

  const results = await Promise.all(
    states.map(state =>
      db.from('tasks').select('*', { count: 'exact', head: true }).eq('state', state)
    )
  )

  return {
    completed: results[0].count || 0,
    dead: results[1].count || 0,
    pending: results[2].count || 0,
    cancelled: results[3].count || 0,
  }
}

/**
 * Alert counts using exact count queries per level.
 * Same fix as getTaskCounts — avoids 1,000-row limit.
 */
export async function getAlertCounts(): Promise<AlertCounts> {
  const db = createServerClient()
  const levels = ['critical', 'error', 'warn', 'info'] as const

  const results = await Promise.all(
    levels.map(level =>
      db.from('founder_alerts').select('*', { count: 'exact', head: true }).eq('level', level)
    )
  )

  return {
    critical: results[0].count || 0,
    error: results[1].count || 0,
    warn: results[2].count || 0,
    info: results[3].count || 0,
  }
}

export async function getCriticalAlerts() {
  const db = createServerClient()
  const { data } = await db
    .from('founder_alerts')
    .select('id, level, source, context, created_at, delivered')
    .eq('level', 'critical')
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

export async function getFailurePatterns(): Promise<FailurePattern[]> {
  const db = createServerClient()
  const { data } = await db
    .from('failure_patterns')
    .select('*')
    .eq('status', 'open')
    .order('occurrences', { ascending: false })
    .limit(10)

  return (data as FailurePattern[]) || []
}

/**
 * Product health from project_registry directly.
 * Previous approach used v_infra_topology view which doesn't include
 * product_type or deployment_health columns, causing empty results.
 */
export async function getProductHealth(): Promise<ProductHealth[]> {
  const db = createServerClient()
  const { data } = await db
    .from('project_registry')
    .select('project_name, url, account_tier, product_type, github_repo, vercel_project_id, supabase_project_id, deployment_health')
    .order('account_tier')
    .order('project_name')

  // Add placeholder fields that were in v_infra_topology
  return (data || []).map(p => ({
    ...p,
    open_findings: 0, // TODO: join audit_findings when RLS permits
    last_audit_at: null,
  })) as ProductHealth[]
}

export async function getRecentWorkerRuns(limit = 20): Promise<WorkerRun[]> {
  const db = createServerClient()
  const { data } = await db
    .from('worker_runs')
    .select('id, started_at, completed_at, tasks_processed, tasks_failed, status, locked_by')
    .order('started_at', { ascending: false })
    .limit(limit)

  return (data as WorkerRun[]) || []
}

export async function getWorkerStats() {
  const db = createServerClient()
  const { count: totalRuns } = await db
    .from('worker_runs')
    .select('*', { count: 'exact', head: true })

  const { data: recentRuns } = await db
    .from('worker_runs')
    .select('started_at, completed_at, tasks_processed, tasks_failed, status')
    .order('started_at', { ascending: false })
    .limit(100)

  const completed = recentRuns?.filter(r => r.status === 'completed').length || 0
  const failed = recentRuns?.filter(r => r.status === 'failed').length || 0
  const totalProcessed = recentRuns?.reduce((s, r) => s + (r.tasks_processed || 0), 0) || 0
  const totalFailed = recentRuns?.reduce((s, r) => s + (r.tasks_failed || 0), 0) || 0

  return {
    totalRuns: totalRuns || 0,
    recentCompleted: completed,
    recentFailed: failed,
    recentTasksProcessed: totalProcessed,
    recentTasksFailed: totalFailed,
    lastRun: recentRuns?.[0] || null,
  }
}

export async function getMemoryEntries(): Promise<MemoryEntry[]> {
  const db = createServerClient()
  const { data } = await db
    .from('execution_memory')
    .select('id, project, key, value, created_at, expires_at')
    .order('project')
    .order('key')

  return (data as MemoryEntry[]) || []
}

export async function getPendingGrants(): Promise<PendingGrant[]> {
  const db = createServerClient()
  const { data } = await db
    .from('mcp_access_grants')
    .select('id, scope, resource_pattern, requested_task, expires_at, created_at')
    .is('granted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (data as PendingGrant[]) || []
}

export async function getLatestDigest(): Promise<DigestEntry | null> {
  const db = createServerClient()
  const { data } = await db
    .from('founder_digest_log')
    .select('id, digest_date, digest_content, created_at')
    .order('digest_date', { ascending: false })
    .limit(1)

  return data?.[0] as DigestEntry || null
}

export async function getSystemPulse() {
  const [taskCounts, alertCounts, pendingGrants] = await Promise.all([
    getTaskCounts(),
    getAlertCounts(),
    getPendingGrants(),
  ])

  const isOperational = alertCounts.critical === 0 && taskCounts.pending === 0
  const needsAttention = alertCounts.critical + pendingGrants.length

  return {
    isOperational,
    needsAttention,
    taskCounts,
    alertCounts,
    pendingGrants: pendingGrants.length,
  }
}
