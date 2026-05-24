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

export async function getTaskCounts(): Promise<TaskCounts> {
  const db = createServerClient()
  const { data: rows } = await db
    .from('tasks')
    .select('state')

  const counts: TaskCounts = { completed: 0, dead: 0, pending: 0, cancelled: 0 }
  if (rows) {
    for (const row of rows) {
      const s = row.state as keyof TaskCounts
      if (s in counts) counts[s]++
    }
  }
  return counts
}

export async function getAlertCounts(): Promise<AlertCounts> {
  const db = createServerClient()
  const { data: rows } = await db
    .from('founder_alerts')
    .select('level')

  const counts: AlertCounts = { critical: 0, error: 0, warn: 0, info: 0 }
  if (rows) {
    for (const row of rows) {
      const l = row.level as keyof AlertCounts
      if (l in counts) counts[l]++
    }
  }
  return counts
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

export async function getProductHealth(): Promise<ProductHealth[]> {
  const db = createServerClient()
  const { data } = await db
    .from('v_infra_topology')
    .select('project_name, url, account_tier, open_findings, last_audit_at, product_type, github_repo, vercel_project_id, supabase_project_id, deployment_health')
    .order('account_tier')
    .order('project_name')

  return (data as ProductHealth[]) || []
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
