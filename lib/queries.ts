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
  requested_task: string | null
  expires_at: string
  // mcp_access_grants has no created_at column; sort by expires_at instead.
}

export type GrantRow = {
  id: string
  scope: string
  resource_pattern: string
  requested_task: string | null
  granted_at: string | null
  expires_at: string
  revoked_at: string | null
  grant_type: string | null
  session_id: string | null
}

export type DigestEntry = {
  id: string
  digest_date: string
  digest_content: any
  created_at: string
}

export type TaskState = 'completed' | 'dead' | 'cancelled' | 'pending'

export type TaskRow = {
  id: string
  action: string
  state: TaskState
  tier: number | null
  priority: number | null
  attempts: number
  max_attempts: number | null
  last_error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  parent_job_id: string | null
  artifacts: any
}

/** Full task row — all columns. Used by the detail page. */
export type TaskDetail = TaskRow & {
  agent_id: string | null
  input: any
  result: any
  logs: string[] | null
  locked_by: string | null
  locked_at: string | null
  available_at: string | null
  idempotency_key: string | null
  depends_on: string[] | null
}

export type TaskPage = {
  rows: TaskRow[]
  page: number
  pageSize: number
  hasMore: boolean
}

// ─── Queries ─────────────────────────────────────────────────────

/**
 * Task counts using filtered row fetch with high limit.
 */
export async function getTaskCounts(): Promise<TaskCounts> {
  const db = createServerClient()
  const states: TaskState[] = ['completed', 'dead', 'pending', 'cancelled']
  const counts: TaskCounts = { completed: 0, dead: 0, pending: 0, cancelled: 0 }

  await Promise.all(
    states.map(async (state) => {
      const { count } = await db
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('state', state)
      if (count !== null) {
        counts[state] = count
      } else {
        const { data } = await db
          .from('tasks')
          .select('id')
          .eq('state', state)
          .limit(50000)
        counts[state] = data?.length || 0
      }
    })
  )

  return counts
}

export async function getAlertCounts(): Promise<AlertCounts> {
  const db = createServerClient()
  const levels = ['critical', 'error', 'warn', 'info'] as const
  const counts: AlertCounts = { critical: 0, error: 0, warn: 0, info: 0 }

  await Promise.all(
    levels.map(async (level) => {
      const { count } = await db
        .from('founder_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('level', level)
      if (count !== null) {
        counts[level] = count
      } else {
        const { data } = await db
          .from('founder_alerts')
          .select('id')
          .eq('level', level)
          .limit(50000)
        counts[level] = data?.length || 0
      }
    })
  )

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
    .eq('status', 'active')
    .order('occurrences', { ascending: false })
    .limit(10)

  return (data as FailurePattern[]) || []
}

export async function getProductHealth(): Promise<ProductHealth[]> {
  const db = createServerClient()
  const { data } = await db
    .from('project_registry')
    .select('project_name, url, account_tier, product_type, github_repo, vercel_project_id, supabase_project_id, deployment_health')
    .order('account_tier')
    .order('project_name')

  return (data || []).map(p => ({
    ...p,
    open_findings: 0,
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

  let finalTotal = totalRuns || 0
  if (totalRuns === null) {
    const { data } = await db.from('worker_runs').select('id').limit(50000)
    finalTotal = data?.length || 0
  }

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
    totalRuns: finalTotal,
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
    .select('id, scope, resource_pattern, requested_task, expires_at')
    .is('granted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  return (data as PendingGrant[]) || []
}

export async function getAllGrants(limit = 200): Promise<GrantRow[]> {
  const db = createServerClient()
  const [pendingRes, decidedRes] = await Promise.all([
    db
      .from('mcp_access_grants')
      .select('id, scope, resource_pattern, requested_task, granted_at, expires_at, revoked_at, grant_type, session_id')
      .is('granted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(50),
    db
      .from('mcp_access_grants')
      .select('id, scope, resource_pattern, requested_task, granted_at, expires_at, revoked_at, grant_type, session_id')
      .not('granted_at', 'is', null)
      .order('granted_at', { ascending: false })
      .limit(limit),
  ])

  const pending = (pendingRes.data as GrantRow[]) || []
  const decided = (decidedRes.data as GrantRow[]) || []
  return [...pending, ...decided]
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

export async function getTasksPage(opts: {
  state?: TaskState | 'all'
  page?: number
  pageSize?: number
}): Promise<TaskPage> {
  const db = createServerClient()
  const page = Math.max(0, opts.page ?? 0)
  const pageSize = Math.min(200, Math.max(10, opts.pageSize ?? 50))
  const from = page * pageSize
  const to = from + pageSize

  let query = db
    .from('tasks')
    .select(
      'id, action, state, tier, priority, attempts, max_attempts, last_error, created_at, started_at, completed_at, parent_job_id, artifacts'
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts.state && opts.state !== 'all') {
    query = query.eq('state', opts.state)
  }

  const { data, error } = await query
  if (error) {
    return { rows: [], page, pageSize, hasMore: false }
  }

  const rows = (data || []) as TaskRow[]
  const hasMore = rows.length > pageSize
  return {
    rows: hasMore ? rows.slice(0, pageSize) : rows,
    page,
    pageSize,
    hasMore,
  }
}

/**
 * Full task detail — all columns.
 * Returns null if not found or ID is invalid UUID.
 */
export async function getTaskById(id: string): Promise<TaskDetail | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return null

  const db = createServerClient()
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as TaskDetail
}
