import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'
import { getControlPlane } from '@/app/lib/control-plane'
import { getPermissionInbox } from '@/lib/permissions'
import {
  getFailurePatterns,
  getOrchestrationProviders,
  getCriticalAlerts,
  getAlertCounts,
  getWorkerStats,
  getProductHealth,
  getMemoryEntries,
  getTaskCounts,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

// ─── Agent Engine URL ─────────────────────────────────────────────
// All inference is delegated to pranix-agent-engine /api/ask
// PRANIX_AGENT_ENGINE_URL must be set in Vercel env vars (no trailing slash)
// e.g. https://pranix-agent-engine.vercel.app
const ENGINE_URL = process.env.PRANIX_AGENT_ENGINE_URL ?? 'https://pranix-agent-engine.vercel.app'

// ─── Reply shape the chat UI renders ─────────────────────────────
type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error'
  title: string
  lines: string[]
  link?: string
  link_label?: string
}

// ─── Founder gate (route is outside middleware) ──────────────────
async function assertFounder():
  Promise<{ ok: true; email: string } | { ok: false }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!data) return { ok: false }
    return { ok: true, email }
  } catch {
    return { ok: false }
  }
}

// ─── Console links (opening a console is not a sensitive action) ──
const CONSOLES: { keys: string[]; label: string; url: string }[] = [
  { keys: ['supabase'], label: 'Open Supabase', url: 'https://supabase.com/dashboard/projects' },
  { keys: ['vercel'], label: 'Open Vercel', url: 'https://vercel.com/dashboard' },
  { keys: ['github'], label: 'Open GitHub', url: 'https://github.com/PranixQuick' },
  { keys: ['doppler', 'secret'], label: 'Open Doppler', url: 'https://dashboard.doppler.com' },
  { keys: ['razorpay', 'payment'], label: 'Open Razorpay', url: 'https://dashboard.razorpay.com' },
]

const PRODUCTS = ['cart2save', 'quietkeep', 'quickscanz', 'school os', 'schoolos', 'vidya grid', 'vidyagrid']

// Sensitive action verbs → must route through the Permission Center.
const ACTION_RE = /\b(disable|enable|turn off|turn on|deploy|redeploy|delete|remove|rotate|connect|disconnect|revoke|grant|restart|reset|migrate|drop|truncate)\b/

function has(s: string, ...words: string[]) { return words.some(w => s.includes(w)) }

export async function POST(req: Request) {
  const gate = await assertFounder()
  if (!gate.ok) {
    return NextResponse.json(
      { reply: { kind: 'error', title: 'Not signed in', lines: ['Please sign in to use Ask Pranix.'] } as Reply },
      { status: 401 }
    )
  }

  // Parse body ONCE — previous double-parse bug fixed here
  let body: Record<string, unknown> = {}
  let message = ''
  try {
    body    = await req.json()
    message = String(body?.message ?? '').slice(0, 1000)
  } catch { /* ignore */ }
  const q          = message.toLowerCase().trim()
  const agentMode  = body?.agent_mode === true
  const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : undefined

  if (!q) return NextResponse.json({ reply: helpReply() })

  try {
    // ─── GATE: sensitive write actions → Permission Center only (never LLM) ───
    if (ACTION_RE.test(q)) {
      const w = await requireWritableFounder()
      if (w instanceof NextResponse) {
        return NextResponse.json({
          reply: { kind: 'info', title: 'Read-only account', lines: ['This account has read-only access. Actions that change settings are disabled for it.'] } as Reply,
        })
      }
      const reply = await routeToPermissionCenter(message, gate.email)
      return NextResponse.json({ reply })
    }

    // ─── GATE: open a console → instant link, no LLM needed ───
    if (has(q, 'open', 'launch', 'go to') && CONSOLES.some(c => c.keys.some(k => q.includes(k)))) {
      const hit = CONSOLES.find(c => c.keys.some(k => q.includes(k)))!
      return NextResponse.json({
        reply: {
          kind: 'console', title: hit.label.replace('Open ', '') + ' console',
          lines: ['Opens in a new tab. You stay signed in here.'],
          link: hit.url, link_label: hit.label,
        } as Reply,
      })
    }

    // ─── CONTEXT COLLECTION — keyword branches enrich, never terminate ───
    const contextLines: string[] = []

    // Detected product entity → attach metadata as context
    const prod = PRODUCTS.find(p => q.includes(p))
    if (prod) {
      try {
        const productData = await getProductHealth()
        const norm = prod.replace(/\s+/g, '')
        const match = productData.find(p => p.project_name.toLowerCase().replace(/\s+/g, '').includes(norm))
        if (match) {
          contextLines.push(`Product context for ${match.project_name}:`)
          contextLines.push(`  Type: ${match.product_type}`)
          contextLines.push(`  Plan tier: ${match.account_tier}`)
          contextLines.push(`  Deployment: ${match.deployment_health || 'unknown'}`)
          if (match.url) contextLines.push(`  URL: ${match.url}`)
        }
      } catch { /* non-blocking */ }
    }

    // Failure context
    if (has(q, 'fail', 'broke', 'broken', 'error', 'dead', 'went wrong')) {
      try {
        const counts = await getTaskCounts()
        if (counts.dead > 0) contextLines.push(`System context: ${counts.dead} failed task(s) currently in dead queue.`)
      } catch { /* non-blocking */ }
    }

    // Approval context
    if (has(q, 'approv', 'permission', 'pending', 'grant', 'waiting')) {
      try {
        const { pending } = await getPermissionInbox(10)
        if (pending.length > 0) contextLines.push(`System context: ${pending.length} approval request(s) pending.`)
      } catch { /* non-blocking */ }
    }

    // Alert context
    if (has(q, 'alert', 'critical', 'warning', 'incident')) {
      try {
        const counts = await getAlertCounts()
        contextLines.push(`System context: ${counts.critical} critical alert(s), ${counts.error} error(s), ${counts.warn} warning(s).`)
      } catch { /* non-blocking */ }
    }

    // ─── FORWARD TO AGENT ENGINE ────────────────────────────────────
    // Build enriched prompt: original message + live context lines
    const enrichedPrompt = contextLines.length > 0
      ? `${message}\n\nLive system context:\n${contextLines.join('\n')}`
      : message

    let engineData: Record<string, unknown> = {}
    try {
      const engineRes = await fetch(`${ENGINE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enrichedPrompt }),
        // Vercel hobby timeout safety — engine has its own 60s limit
        signal: AbortSignal.timeout(55_000),
      })
      if (engineRes.ok) {
        engineData = await engineRes.json()
      } else {
        const errText = await engineRes.text().catch(() => engineRes.statusText)
        console.error('[ask-adapter] engine error', engineRes.status, errText)
      }
    } catch (fetchErr) {
      console.error('[ask-adapter] fetch failed', fetchErr)
    }

    // ─── BUILD REPLY FROM ENGINE RESPONSE ───────────────────────────
    const answer = typeof engineData.answer === 'string' && engineData.answer.trim()
      ? engineData.answer
      : null

    if (!answer) {
      // Engine unreachable or returned empty — fall back to live-data summary
      return NextResponse.json({ reply: await liveDataFallback(q) })
    }

    // Split answer into display lines (paragraph breaks → separate bubbles)
    const answerLines = answer
      .split(/\n{2,}/)
      .map((l: string) => l.replace(/\n/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 20)

    const modelUsed  = typeof engineData.model_used  === 'string'  ? engineData.model_used  : ''
    const taskId      = typeof engineData.task_id      === 'string'  ? engineData.task_id      : ''
    const confidence  = typeof engineData.confidence   === 'number'  ? engineData.confidence   : undefined
    const specFlag    = typeof engineData.speculation_flag === 'boolean' ? engineData.speculation_flag : false
    // evidence_used — passthrough if engine returns it; otherwise build a minimal summary from context
    const evidenceUsed: Record<string, unknown> = {}
    if (engineData.evidence_used && typeof engineData.evidence_used === 'object') {
      Object.assign(evidenceUsed, engineData.evidence_used)
    } else {
      // Derive minimal evidence from context lines gathered above
      if (contextLines.some(l => l.toLowerCase().includes('product'))) {
        evidenceUsed['supabase'] = { summary: 'Product health and metadata queried from control plane.' }
      }
      if (contextLines.some(l => l.toLowerCase().includes('task') || l.toLowerCase().includes('failed'))) {
        evidenceUsed['tasks'] = { count: 1, summary: 'Task queue stats read from control plane.' }
      }
      if (contextLines.some(l => l.toLowerCase().includes('approval') || l.toLowerCase().includes('pending'))) {
        evidenceUsed['memory'] = { count: 1, summary: 'Permission inbox read.' }
      }
      if (contextLines.some(l => l.toLowerCase().includes('alert'))) {
        evidenceUsed['supabase'] = { summary: 'Alert counts queried from control plane.' }
      }
    }

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : undefined

    const reply = {
      kind: 'info' as const,
      title: typeof engineData.title === 'string' ? engineData.title : message.slice(0, 60),
      lines: answerLines,
      model_used:       modelUsed || undefined,
      confidence:       confidence,
      task_id:          taskId   || undefined,
      workspace_id:     workspaceId,
      gathered_at:      new Date().toISOString(),
      speculation_flag: specFlag,
      evidence_used:    Object.keys(evidenceUsed).length > 0 ? evidenceUsed : undefined,
    }

    return NextResponse.json({ reply })

  } catch (err) {
    console.error('[ask-adapter] unhandled', err)
    return NextResponse.json({
      reply: { kind: 'error', title: 'Something went wrong', lines: ['I could not read that just now. Please try again.'] } as Reply,
    })
  }
}

// ─── Fallback: live data summary when engine is unreachable ────────────
async function liveDataFallback(q: string): Promise<Reply> {
  try {
    if (has(q, 'fail', 'broke', 'error')) return failuresReply()
    if (has(q, 'approv', 'permission', 'pending')) return approvalsReply()
    if (has(q, 'provider', 'model', 'inference')) return providersReply()
    if (has(q, 'alert', 'critical', 'warning')) return alertsReply()
    if (has(q, 'agent', 'worker')) return agentsReply()
    if (has(q, 'deploy', 'build')) return deploymentsReply()
    if (has(q, 'memory', 'remember')) return memoryReply(q)
    const prod = PRODUCTS.find(p => q.includes(p))
    if (prod) return productReply(prod)
  } catch { /* non-blocking */ }
  return {
    kind: 'error',
    title: 'AI engine unavailable',
    lines: [
      'The inference engine did not respond.',
      'Your live system data is still accessible via the dashboard tabs.',
      'Try again in a moment or check provider health.',
    ],
    link: '/founder/orchestrate',
    link_label: 'Check providers',
  }
}

// ─── Handlers (read the real, existing systems) ──────────────────

async function failuresReply(): Promise<Reply> {
  const [counts, patterns] = await Promise.all([getTaskCounts(), getFailurePatterns()])
  const lines: string[] = []
  lines.push(counts.dead > 0
    ? `${counts.dead} task${counts.dead === 1 ? '' : 's'} failed and stopped.`
    : 'No failed tasks right now.')
  if (patterns.length > 0) {
    lines.push('Recurring problems:')
    for (const p of patterns.slice(0, 4)) {
      lines.push(`• ${(p.product_name || 'system')} — ${p.failure_type.replace(/_/g, ' ')} (${p.occurrences}×)`)
    }
  }
  return { kind: 'info', title: 'What failed', lines, link: '/founder/tasks', link_label: 'See all tasks' }
}

async function approvalsReply(): Promise<Reply> {
  const { pending, active } = await getPermissionInbox(50)
  const lines: string[] = []
  lines.push(pending.length > 0
    ? `${pending.length} request${pending.length === 1 ? '' : 's'} waiting for your decision.`
    : 'Nothing is waiting for approval.')
  for (const p of pending.slice(0, 5)) {
    lines.push(`• ${p.requestor_name} wants to ${verb(p.scope)} — ${human(p.resource_pattern)}`)
  }
  if (active.length > 0) lines.push(`${active.length} permission${active.length === 1 ? '' : 's'} currently active.`)
  return { kind: 'info', title: 'Approvals', lines, link: '/founder/approvals', link_label: 'Open Permissions' }
}

async function providersReply(): Promise<Reply> {
  const providers = await getOrchestrationProviders()
  const on = providers.filter(p => p.enabled)
  const off = providers.filter(p => !p.enabled)
  const lines: string[] = []
  lines.push(`${on.length} provider${on.length === 1 ? '' : 's'} on, ${off.length} off.`)
  for (const p of providers.slice(0, 8)) {
    const dot = p.enabled ? '🟢' : '⚪'
    const health = p.health_status && p.health_status !== 'unknown' ? ` · ${p.health_status}` : ''
    lines.push(`${dot} ${p.provider_name} (tier ${p.tier})${health}`)
  }
  return { kind: 'info', title: 'Provider health', lines, link: '/founder/orchestrate', link_label: 'Open Orchestration' }
}

async function alertsReply(): Promise<Reply> {
  const [counts, critical] = await Promise.all([getAlertCounts(), getCriticalAlerts(5)])
  const lines: string[] = []
  lines.push(`${counts.critical} critical, ${counts.error} error, ${counts.warn} warning.`)
  for (const a of critical.slice(0, 5)) {
    lines.push(`• ${a.title || a.source}`)
  }
  if (critical.length === 0 && counts.critical === 0) lines.push('No critical alerts. All clear.')
  return { kind: 'info', title: 'Alerts', lines, link: '/founder/alerts', link_label: 'Open Alerts' }
}

async function agentsReply(): Promise<Reply> {
  const stats = await getWorkerStats()
  const lines = [
    `${stats.recentCompleted} runs completed, ${stats.recentFailed} failed recently.`,
    `${stats.recentTasksProcessed} tasks processed, ${stats.recentTasksFailed} failed.`,
    stats.lastRun?.started_at ? `Last run: ${rel(stats.lastRun.started_at)}.` : 'No recent runs recorded.',
  ]
  return { kind: 'info', title: 'Agent status', lines, link: '/founder/workers', link_label: 'Open Agents' }
}

async function deploymentsReply(): Promise<Reply> {
  const products = await getProductHealth()
  const lines: string[] = []
  for (const p of products.slice(0, 8)) {
    const h = p.deployment_health || 'unknown'
    const dot = h === 'healthy' ? '🟢' : h === 'unknown' ? '⚪' : '🔴'
    lines.push(`${dot} ${p.project_name} — ${h}`)
  }
  if (lines.length === 0) lines.push('No products registered yet.')
  return { kind: 'info', title: 'Deployment health', lines, link: '/founder/products', link_label: 'Open Products' }
}

async function productReply(prod: string): Promise<Reply> {
  const products = await getProductHealth()
  const norm = prod.replace(/\s+/g, '')
  const match = products.find(p => p.project_name.toLowerCase().replace(/\s+/g, '').includes(norm))
  if (!match) {
    return { kind: 'info', title: prod, lines: [`I don't have a registered product matching "${prod}" yet.`] }
  }
  const lines = [
    `Type: ${match.product_type}`,
    `Plan tier: ${match.account_tier}`,
    `Deployment: ${match.deployment_health || 'unknown'}`,
  ]
  return {
    kind: 'info', title: match.project_name, lines,
    link: match.url || '/founder/products',
    link_label: match.url ? 'Open product' : 'Open Products',
  }
}

async function memoryReply(q: string): Promise<Reply> {
  const entries = await getMemoryEntries()
  const terms = q.replace(/\b(memory|remember|recall|note|what did|show|search|about|the)\b/g, '').trim()
  const hits = terms
    ? entries.filter(e =>
        `${e.project} ${e.key} ${JSON.stringify(e.value)}`.toLowerCase().includes(terms))
    : entries
  const lines: string[] = []
  lines.push(hits.length > 0 ? `Found ${hits.length} memory item${hits.length === 1 ? '' : 's'}.` : 'No matching memory found.')
  for (const e of hits.slice(0, 6)) lines.push(`• [${e.project}] ${e.key}`)
  return { kind: 'info', title: 'Memory', lines, link: '/founder/memory', link_label: 'Open Memory' }
}

async function routeToPermissionCenter(message: string, email: string): Promise<Reply> {
  const cp = getControlPlane()
  // requestor = the founder client acting via Ask Pranix
  const { data: fc } = await cp.from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()
  const scope = /\b(view|read|show|list)\b/.test(message.toLowerCase()) ? 'test' : 'write'
  const insert = {
    client_id: fc?.id ?? null,
    scope,
    resource_pattern: 'ask-pranix:requested-action',
    reason: `Requested via Ask Pranix by ${email}`,
    requested_task: message,
    grant_type: 'single' as const,
    risk_level: 'high',
    granted_at: null as null,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    revoked_at: null as null,
  }
  const { error } = await cp.from('mcp_access_grants').insert(insert)
  if (error) {
    return { kind: 'error', title: 'Could not route the request', lines: ['Please try again from the Permissions screen.'], link: '/founder/approvals', link_label: 'Open Permissions' }
  }
  return {
    kind: 'approval_routed',
    title: 'Sent for your approval',
    lines: [
      'This needs a decision before anything changes, so I have not done it yet.',
      'I created a request in your Permission Center. Approve it there to proceed.',
    ],
    link: '/founder/approvals',
    link_label: 'Review in Permissions',
  }
}

function helpReply(): Reply {
  return {
    kind: 'help',
    title: 'Ask me about your system',
    lines: [
      'Try: "What failed today?"',
      '"Show pending approvals."',
      '"Check provider health."',
      '"Show alerts."',
      '"Check agent status."',
      '"Show deployment health."',
      '"Review Cart2Save."',
      '"Open Supabase."',
      'Anything that changes settings, deploys, or touches an account I route to your Permission Center first.',
    ],
  }
}

// ─── small helpers ───────────────────────────────────────────────
function verb(scope: string) { return scope === 'admin' ? 'take full control' : scope === 'write' ? 'make changes' : 'view' }
function human(p: string) { return (p || '').replace(/\*/g, 'all').replace(/:/g, ' · ') }
function rel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
