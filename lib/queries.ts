import { createServerClient } from './supabase'

// ─── Types ───────────────────────────────────────────────────────

export type TaskCounts = {
  completed: number
  dead: number
  pending: number
  cancelled: number
  archived: number
}

export type AlertCounts = {
  critical: number
  error: number
  warn: number
  info: number
}

export type AlertTierCounts = {
  p1: number
  p2: number
  p3: number
  p4: number
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

export type TaskState = 'completed' | 'dead' | 'cancelled' | 'pending' | 'archived'

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

export type ReviewArtifact = {
  id: string
  project_name: string
  check_name: string
  viewport: string
  status: string
  diff_score: number | null
  storage_path: string
  signed_url: string | null
  created_at: string
}

export type WorkerNode = {
  tier: number
  label: string
  description: string
  online: boolean
  last_seen: string | null
  total_runs: number
}

export type OrchestrationProvider = {
  provider_name: string
  tier: number
  enabled: boolean
  health_status: string
  health_checked_at: string | null
}

export type RecentActivity = {
  id: string
  kind: 'task' | 'agent' | 'alert' | 'worker' | 'deploy'
  label: string
  sub: string
  created_at: string
  severity?: string
}

export type ExecutionForensic = {
  id: string
  project: string
  key: string
  value: any
  created_at: string
}

export type CronHealth = {
  jobname: string
  schedule: string
  active: boolean
  total_runs: number
  failed_runs: number
  last_run: string | null
  last_status: string | null
}

// ─── Queries ─────────────────────────────────────────────────────

export async function getTaskCounts(): Promise<TaskCounts> {
  const db = createServerClient()
  const states: TaskState[] = ['completed', 'dead', 'pending', 'cancelled', 'archived']
  const counts: TaskCounts = { completed: 0, dead: 0, pending: 0, cancelled: 0, archived: 0 }
  await Promise.all(
    states.map(async (state) => {
      const { count } = await db
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('state', state)
      counts[state] = count ?? 0
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
      counts[level] = count ?? 0
    })
  )
  return counts
}

export async function getAlertTierCounts(): Promise<AlertTierCounts> {
  const db = createServerClient()
  const tiers = ['P1', 'P2', 'P3', 'P4'] as const
  const counts: AlertTierCounts = { p1: 0, p2: 0, p3: 0, p4: 0 }
  await Promise.all(
    tiers.map(async (tier) => {
      const { count } = await db
        .from('founder_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('severity_tier', tier)
      const key = tier.toLowerCase() as keyof AlertTierCounts
      counts[key] = count ?? 0
    })
  )
  return counts
}

export async function getCriticalAlerts(limit = 20) {
  const db = createServerClient()
  const { data } = await db
    .from('founder_alerts')
    .select('id, level, source, title, body, context, created_at, delivered, severity_tier, auto_whatsapp')
    .in('level', ['critical', 'warn'])
    .order('created_at', { ascending: false })
    .limit(limit)
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

export type SemanticMemoryEntry = {
  id: string
  project: string
  scope: string
  content: string
  salience: number
  source_kind: string | null
  created_at: string
  is_protected: boolean
  is_anchor: boolean
}

export async function getSemanticMemoryEntries(): Promise<SemanticMemoryEntry[]> {
  const db = createServerClient()
  const nowIso = new Date().toISOString()
  const { data } = await db
    .from('pranix_memory')
    .select('id, project, scope, content, salience, source_kind, created_at, is_protected, is_anchor')
    .is('superseded_by', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('salience', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)
  return (data as SemanticMemoryEntry[]) || []
}

export async function getProductHealth(): Promise<ProductHealth[]> {
  const db = createServerClient()
  // Phase G3 — replace hardcoded zeros with real audit telemetry.
  const [registryRes, findingsRes, runsRes] = await Promise.all([
    db.from('project_registry')
      .select('project_name, url, account_tier, product_type, github_repo, vercel_project_id, supabase_project_id, deployment_health')
      .order('account_tier')
      .order('project_name'),
    db.from('audit_findings')
      .select('product_name')
      .eq('status', 'open'),
    db.from('audit_runs')
      .select('product_name, completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
  ])

  const openByProduct = new Map<string, number>()
  for (const f of ((findingsRes.data || []) as { product_name: string | null }[])) {
    if (!f.product_name) continue
    openByProduct.set(f.product_name, (openByProduct.get(f.product_name) ?? 0) + 1)
  }
  const lastAuditByProduct = new Map<string, string>()
  for (const r of ((runsRes.data || []) as { product_name: string | null; completed_at: string | null }[])) {
    if (!r.product_name || !r.completed_at) continue
    if (!lastAuditByProduct.has(r.product_name)) lastAuditByProduct.set(r.product_name, r.completed_at)
  }

  return ((registryRes.data || []) as Omit<ProductHealth, 'open_findings' | 'last_audit_at'>[]).map(p => ({
    ...p,
    open_findings: openByProduct.get(p.project_name) ?? 0,
    last_audit_at: lastAuditByProduct.get(p.project_name) ?? null,
  })) as ProductHealth[]
}

export async function getWorkerNodes(): Promise<WorkerNode[]> {
  const db = createServerClient()
  const { data } = await db
    .from('worker_nodes')
    .select('*')
    .order('tier')
  if (data && data.length > 0) return data as WorkerNode[]
  // Fallback: synthesise from worker_runs last seen
  const { data: runs } = await db
    .from('worker_runs')
    .select('locked_by, started_at, status')
    .order('started_at', { ascending: false })
    .limit(200)
  const nodes: WorkerNode[] = [
    {
      tier: 0,
      label: 'Tier 0 — Vercel Cron',
      description: '60s tick, lightweight task claiming',
      online: true,
      last_seen: runs?.[0]?.started_at ?? null,
      total_runs: runs?.filter(r => r.locked_by?.includes('vercel') || r.locked_by?.includes('cron')).length ?? 0,
    },
    {
      tier: 1,
      label: 'Tier 1 — Supabase Edge Function',
      description: '2min tick, heavy task processing',
      online: true,
      last_seen: runs?.[0]?.started_at ?? null,
      total_runs: runs?.filter(r => r.locked_by?.includes('edge') || r.locked_by?.includes('supabase')).length ?? 0,
    },
    {
      tier: 2,
      label: 'Tier 2 — Fly.io Browser Worker',
      description: 'Playwright automation, not yet deployed',
      online: false,
      last_seen: null,
      total_runs: 0,
    },
  ]
  return nodes
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
  const { count: totalRuns } = await db.from('worker_runs').select('*', { count: 'exact', head: true })
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
    totalRuns: totalRuns ?? 0,
    recentCompleted: completed,
    recentFailed: failed,
    recentTasksProcessed: totalProcessed,
    recentTasksFailed: totalFailed,
    lastRun: recentRuns?.[0] || null,
  }
}

export async function getOrchestrationProviders(): Promise<OrchestrationProvider[]> {
  const db = createServerClient()
  const { data } = await db
    .from('provider_registry')
    .select('provider_name, tier, enabled, health_status, health_checked_at')
    .order('tier')
    .order('provider_name')
  return (data as OrchestrationProvider[]) || []
}

export async function getRecentActivity(limit = 8): Promise<RecentActivity[]> {
  const db = createServerClient()
  // Pull from tasks + alerts combined, most recent first
  const [tasksRes, alertsRes] = await Promise.all([
    db.from('tasks')
      .select('id, action, state, created_at, last_error')
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('founder_alerts')
      .select('id, source, title, level, created_at, severity_tier')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const taskItems: RecentActivity[] = (tasksRes.data || []).map(t => ({
    id: t.id,
    kind: 'task' as const,
    label: t.action.replace(/_/g, ' '),
    sub: t.state === 'dead' ? (t.last_error?.slice(0, 60) ?? 'failed') : t.state,
    created_at: t.created_at,
    severity: t.state === 'dead' ? 'error' : t.state === 'completed' ? 'success' : 'info',
  }))

  const alertItems: RecentActivity[] = (alertsRes.data || []).map(a => ({
    id: a.id,
    kind: 'alert' as const,
    label: a.title ?? a.source,
    sub: a.source,
    created_at: a.created_at,
    severity: a.level,
  }))

  const all = [...taskItems, ...alertItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return all
}

export async function getLatestForensic(): Promise<ExecutionForensic | null> {
  const db = createServerClient()
  const { data } = await db
    .from('execution_memory')
    .select('id, project, key, value, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] as ExecutionForensic ?? null
}

export async function getCronHealth(): Promise<CronHealth[]> {
  const db = createServerClient()
  const { data } = await db
    .from('v_cron_health')
    .select('jobname, schedule, active, total_runs, failed_runs, last_run, last_status')
    .order('failed_runs', { ascending: false })
    .order('last_run', { ascending: false })
  return (data as CronHealth[]) || []
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
    db.from('mcp_access_grants')
      .select('id, scope, resource_pattern, requested_task, granted_at, expires_at, revoked_at, grant_type, session_id')
      .is('granted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(50),
    db.from('mcp_access_grants')
      .select('id, scope, resource_pattern, requested_task, granted_at, expires_at, revoked_at, grant_type, session_id')
      .not('granted_at', 'is', null)
      .order('granted_at', { ascending: false })
      .limit(limit),
  ])
  return [...((pendingRes.data as GrantRow[]) || []), ...((decidedRes.data as GrantRow[]) || [])]
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
  const [taskCounts, alertCounts, pendingGrants, workerStats] = await Promise.all([
    getTaskCounts(),
    getAlertCounts(),
    getPendingGrants(),
    getWorkerStats(),
  ])
  const isOperational = alertCounts.critical === 0 && taskCounts.pending === 0
  const needsAttention = alertCounts.critical + pendingGrants.length
  return {
    isOperational,
    needsAttention,
    taskCounts,
    alertCounts,
    pendingGrants: pendingGrants.length,
    workerStats,
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
    .select('id, action, state, tier, priority, attempts, max_attempts, last_error, created_at, started_at, completed_at, parent_job_id, artifacts')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts.state && opts.state !== 'all') {
    query = query.eq('state', opts.state)
  }

  const { data, error } = await query
  if (error) return { rows: [], page, pageSize, hasMore: false }
  const rows = (data || []) as TaskRow[]
  const hasMore = rows.length > pageSize
  return { rows: hasMore ? rows.slice(0, pageSize) : rows, page, pageSize, hasMore }
}

export async function getTaskById(id: string): Promise<TaskDetail | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return null
  const db = createServerClient()
  const { data, error } = await db.from('tasks').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return data as TaskDetail
}

// Signed-URL TTL: founder views this on a mobile PWA that can keep a rendered
// page alive for many hours. 1h tokens expired in-page and every <img> broke
// with 400 InvalidJWT. 24h survives realistic session lengths.
const ARTIFACT_SIGN_TTL_SEC = 86400

export async function getReviewArtifacts(): Promise<ReviewArtifact[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('browser_artifacts')
    .select('id, project_name, check_name, viewport, status, diff_score, storage_path, created_at')
    .in('status', ['review', 'fail'])
    .not('check_name', 'like', 'failure_step_%')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  const withUrls = await Promise.all(
    data.map(async (a) => {
      const { data: signed } = await db.storage.from('artifacts').createSignedUrl(a.storage_path, ARTIFACT_SIGN_TTL_SEC)
      return { ...a, signed_url: signed?.signedUrl || null }
    })
  )
  return withUrls as ReviewArtifact[]
}

export type EvidenceArtifact = {
  id: string
  project_name: string
  check_name: string
  viewport: string
  status: string
  artifact_type: string
  storage_path: string
  signed_url: string | null
  created_at: string
}

// Evidence feed: every artifact the browser worker produced — videos,
// failure screenshots, passing screenshots — newest first.
export async function getEvidenceArtifacts(limit = 60): Promise<EvidenceArtifact[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('browser_artifacts')
    .select('id, project_name, check_name, viewport, status, artifact_type, storage_path, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  const withUrls = await Promise.all(
    data.map(async (a) => {
      const { data: signed } = await db.storage.from('artifacts').createSignedUrl(a.storage_path, ARTIFACT_SIGN_TTL_SEC)
      return { ...a, signed_url: signed?.signedUrl || null }
    })
  )
  return withUrls as EvidenceArtifact[]
}

export async function getMemoryCount(): Promise<number> {
  const db = createServerClient()
  const { count } = await db.from('pranix_memory').select('*', { count: 'exact', head: true })
  return count ?? 0
}

// ─── Founder Business Command Center (Phase G) ───────────────────
// Reads the daily business snapshot. Reuses the existing revenue_snapshots
// table (source='business_snapshot_v1') — no new table, no new DB.

export type ProductBusiness = {
  status: string
  readable: boolean
  [k: string]: any
}

export type BusinessSnapshot = {
  captured_at: string
  version: number
  products: Record<string, ProductBusiness>
  totals: { revenue_collected_inr?: number; revenue_billed_inr?: number }
}

export async function getBusinessSnapshot(): Promise<BusinessSnapshot | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('revenue_snapshots')
    .select('captured_at, raw_payload')
    .eq('source', 'business_snapshot_v1')
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const p = (data.raw_payload || {}) as any
  return {
    captured_at: data.captured_at,
    version: p.version ?? 1,
    products: p.products ?? {},
    totals: p.totals ?? {},
  }
}

export type PendingIdea = {
  id: string
  text: string
  status: string
  created_at: string
}

export async function getPendingIdeas(): Promise<PendingIdea[]> {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('founder_ideas')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) return []
    return (data as PendingIdea[]) || []
  } catch {
    return []
  }
}

export async function getCompletedTasksStats() {
  const db = createServerClient()
  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)
  
  const weekStart = new Date()
  const day = weekStart.getDay()
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
  weekStart.setDate(diff)
  weekStart.setHours(0,0,0,0)

  const [todayRes, weekRes] = await Promise.all([
    db.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'completed')
      .gte('completed_at', todayStart.toISOString()),
    db.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'completed')
      .gte('completed_at', weekStart.toISOString())
  ])
  return {
    today: todayRes.count ?? 0,
    week: weekRes.count ?? 0
  }
}

export async function getTaskBoardData() {
  const db = createServerClient()
  const [missions, steps, heartbeats] = await Promise.all([
    db.from('missions').select('*').order('created_at', { ascending: false }),
    db.from('mission_steps').select('*').order('seq', { ascending: true }),
    db.from('worker_heartbeats').select('*')
  ])
  return {
    missions: missions.data || [],
    steps: steps.data || [],
    heartbeats: heartbeats.data || []
  }
}
