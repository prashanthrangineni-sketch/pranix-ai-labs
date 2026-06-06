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

// ─── Types ──────────────────────────────────────────────────────

export type IntentKind =
  | 'audit_product'
  | 'fix_issue'
  | 'growth_analysis'
  | 'launch_plan'
  | 'infrastructure_check'
  | 'approvals_check'
  | 'memory_search'
  | 'provider_health'
  | 'deployment_status'
  | 'agent_status'
  | 'open_console'
  | 'action_requested'   // requires approval gate
  | 'free_form'          // true LLM fallback

export type PlanStep = {
  step: number
  label: string
  tool: string
  status: 'pending' | 'running' | 'done' | 'skipped'
}

export type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error' | 'llm'
  title: string
  lines: string[]
  link?: string
  link_label?: string
  intent?: IntentKind
  plan?: PlanStep[]
  model_used?: string
  streaming?: boolean
}

// ─── Intent classifier (deterministic fast-path, no LLM cost) ───

const ACTION_RE = /\b(disable|enable|turn off|turn on|deploy|redeploy|delete|remove|rotate|connect|disconnect|revoke|grant|restart|reset|migrate|drop|truncate|launch|publish|release|push to production)\b/
const PRODUCTS = ['cart2save', 'quietkeep', 'quickscanz', 'school os', 'schoolos', 'vidya grid', 'vidyagrid']

function has(s: string, ...words: string[]) { return words.some(w => s.includes(w)) }

function classifyIntent(q: string): { intent: IntentKind; confidence: number; project?: string } {
  const s = q.toLowerCase()
  const project = PRODUCTS.find(p => s.includes(p.replace(/ /g, ''))  || s.includes(p))

  if (ACTION_RE.test(s)) return { intent: 'action_requested', confidence: 0.95, project }

  if (has(s, 'why is', 'why are', 'what is wrong', 'slow', 'growth', 'not growing', 'improve', 'opportunity', 'opportunities'))
    return { intent: 'growth_analysis', confidence: 0.85, project }

  if (has(s, 'audit', 'review', 'how is', 'status of', 'check') && project)
    return { intent: 'audit_product', confidence: 0.9, project }

  if (has(s, 'fix', 'broken', 'error', 'issue', 'bug', 'not working', 'failed', 'checkout', 'payment', 'crash'))
    return { intent: 'fix_issue', confidence: 0.85, project }

  if (has(s, 'launch plan', 'prepare launch', 'launch', 'go live', 'release plan', 'ship'))
    return { intent: 'launch_plan', confidence: 0.85, project }

  if (has(s, 'affiliate', 'automation', 'automate', 'improve affiliate'))
    return { intent: 'growth_analysis', confidence: 0.8, project: project ?? 'cart2save' }

  if (has(s, 'all product', 'focus on', 'priorit', 'what should i', 'where should'))
    return { intent: 'growth_analysis', confidence: 0.8 }

  if (has(s, 'fail', 'broke', 'error', 'dead', 'went wrong', 'infra', 'infrastructure'))
    return { intent: 'infrastructure_check', confidence: 0.85 }

  if (has(s, 'approv', 'permission', 'pending', 'grant', 'waiting'))
    return { intent: 'approvals_check', confidence: 0.9 }

  if (has(s, 'provider', 'model', 'inference', 'groq', 'anthropic', 'gemini'))
    return { intent: 'provider_health', confidence: 0.9 }

  if (has(s, 'alert', 'critical', 'warning', 'incident'))
    return { intent: 'infrastructure_check', confidence: 0.85 }

  if (has(s, 'agent', 'worker', 'orchestrat'))
    return { intent: 'agent_status', confidence: 0.9 }

  if (has(s, 'deploy', 'build', 'production', 'live site', 'vercel'))
    return { intent: 'deployment_status', confidence: 0.85 }

  if (has(s, 'memory', 'remember', 'recall', 'note', 'what did'))
    return { intent: 'memory_search', confidence: 0.85 }

  if (has(s, 'open', 'launch', 'go to', 'console', 'supabase', 'github', 'doppler', 'razorpay'))
    return { intent: 'open_console', confidence: 0.8 }

  return { intent: 'free_form', confidence: 0.5, project }
}

// ─── Plan builder: maps intent → ordered step list ───────────────

function buildPlan(intent: IntentKind, project?: string): PlanStep[] {
  const p = (step: number, label: string, tool: string): PlanStep => ({ step, label, tool, status: 'pending' })
  switch (intent) {
    case 'audit_product': return [
      p(1, `Read ${project ?? 'product'} health`, 'getProductHealth'),
      p(2, 'Scan failure patterns', 'getFailurePatterns'),
      p(3, 'Check alerts', 'getCriticalAlerts'),
      p(4, 'Check deployments', 'deploymentsReply'),
      p(5, 'Synthesise audit', 'llm:reason'),
    ]
    case 'fix_issue': return [
      p(1, 'Read failure patterns', 'getFailurePatterns'),
      p(2, `Check ${project ?? 'product'} deployment`, 'getProductHealth'),
      p(3, 'Check recent alerts', 'getCriticalAlerts'),
      p(4, 'Diagnose root cause', 'llm:reason'),
      p(5, 'Generate fix plan', 'llm:code'),
    ]
    case 'growth_analysis': return [
      p(1, `Read ${project ?? 'all products'} health`, 'getProductHealth'),
      p(2, 'Read task history', 'getTaskCounts'),
      p(3, 'Read memory for context', 'getMemoryEntries'),
      p(4, 'Identify growth blockers', 'llm:reason'),
      p(5, 'Generate recommendations', 'llm:generate'),
    ]
    case 'launch_plan': return [
      p(1, `Read ${project ?? 'product'} readiness`, 'getProductHealth'),
      p(2, 'Check pending approvals', 'getPermissionInbox'),
      p(3, 'Check deployment status', 'deploymentsReply'),
      p(4, 'Build launch checklist', 'llm:reason'),
      p(5, 'Generate launch plan', 'llm:generate'),
    ]
    case 'infrastructure_check': return [
      p(1, 'Read failure patterns', 'getFailurePatterns'),
      p(2, 'Check critical alerts', 'getCriticalAlerts'),
      p(3, 'Read worker stats', 'getWorkerStats'),
      p(4, 'Check provider health', 'getOrchestrationProviders'),
      p(5, 'Summarise infrastructure', 'llm:summarize'),
    ]
    default: return [
      p(1, 'Read system context', 'getProductHealth'),
      p(2, 'Generate response', 'llm:reason'),
    ]
  }
}

// ─── Live data collector ─────────────────────────────────────────

async function collectContext(intent: IntentKind, project?: string) {
  const ctx: Record<string, any> = {}
  try {
    switch (intent) {
      case 'audit_product':
      case 'launch_plan': {
        const [products, failures, alerts, counts] = await Promise.all([
          getProductHealth(), getFailurePatterns(), getCriticalAlerts(5), getTaskCounts(),
        ])
        ctx.products = products
        ctx.focusProduct = project ? products.find((p: any) =>
          p.project_name.toLowerCase().replace(/\s+/g, '').includes(project.replace(/\s+/g, ''))
        ) : null
        ctx.failures = failures.slice(0, 6)
        ctx.alerts = alerts.slice(0, 5)
        ctx.taskCounts = counts
        break
      }
      case 'fix_issue': {
        const [failures, products, alerts] = await Promise.all([
          getFailurePatterns(), getProductHealth(), getCriticalAlerts(8),
        ])
        ctx.failures = failures.slice(0, 8)
        ctx.focusProduct = project ? products.find((p: any) =>
          p.project_name.toLowerCase().replace(/\s+/g, '').includes(project.replace(/\s+/g, ''))
        ) : products[0]
        ctx.alerts = alerts.slice(0, 6)
        break
      }
      case 'growth_analysis': {
        const [products, memory, counts] = await Promise.all([
          getProductHealth(), getMemoryEntries(), getTaskCounts(),
        ])
        ctx.products = products
        ctx.memory = memory.slice(0, 10)
        ctx.taskCounts = counts
        ctx.focusProduct = project ? products.find((p: any) =>
          p.project_name.toLowerCase().replace(/\s+/g, '').includes(project.replace(/\s+/g, ''))
        ) : null
        break
      }
      case 'infrastructure_check': {
        const [failures, alerts, workers, providers, counts] = await Promise.all([
          getFailurePatterns(), getCriticalAlerts(8), getWorkerStats(),
          getOrchestrationProviders(), getTaskCounts(),
        ])
        ctx.failures = failures.slice(0, 6)
        ctx.alerts = alerts.slice(0, 6)
        ctx.workers = workers
        ctx.providers = providers.slice(0, 8)
        ctx.taskCounts = counts
        break
      }
      case 'approvals_check': {
        const { pending, active } = await getPermissionInbox(20)
        ctx.pending = pending
        ctx.active = active
        break
      }
      case 'provider_health': {
        ctx.providers = await getOrchestrationProviders()
        break
      }
      case 'agent_status': {
        ctx.workers = await getWorkerStats()
        break
      }
      case 'deployment_status': {
        ctx.products = await getProductHealth()
        break
      }
      case 'memory_search': {
        ctx.memory = await getMemoryEntries()
        break
      }
      default: {
        ctx.products = await getProductHealth()
        break
      }
    }
  } catch { /* partial context is fine */ }
  return ctx
}

// ─── LLM inference via Pranix control plane ──────────────────────

async function callInference(
  taskType: 'reason' | 'generate' | 'summarize' | 'code',
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; model: string }> {
  const cp = getControlPlane()
  // Fetch best available model for task type
  const { data: models } = await cp
    .from('model_registry')
    .select('model_id, provider_name')
    .eq('task_type', taskType)
    .eq('enabled', true)
    .order('priority', { ascending: true })
    .limit(1)

  const model = models?.[0]
  if (!model) return { text: '', model: 'none' }

  // Call inference via pranix-mcp gateway
  const endpoint = process.env.PRANIX_INFERENCE_URL ?? 'https://api.pranix.com/v1/inference'
  const apiKey = process.env.PRANIX_MCP_BEARER
  if (!apiKey) return { text: '', model: 'no-key' }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        task_type: taskType,
        prompt: userPrompt,
        system: systemPrompt,
        routing_token: 'rt_ask_inline',
      }),
      signal: AbortSignal.timeout(28000),
    })
    if (!res.ok) return { text: '', model: model.model_id }
    const data = await res.json()
    return { text: data?.result ?? data?.text ?? '', model: model.model_id }
  } catch {
    return { text: '', model: model.model_id }
  }
}

// ─── Response synthesiser ────────────────────────────────────────

async function synthesise(
  originalMessage: string,
  intent: IntentKind,
  ctx: Record<string, any>,
  project?: string,
): Promise<{ title: string; lines: string[]; link?: string; link_label?: string; model_used?: string }> {

  // Build a tight, data-rich system prompt
  const systemPrompt = [
    'You are the Pranix Founder Assistant. You have direct access to real live data.',
    'Answer as a trusted, direct advisor. Be specific. Use numbers from the context.',
    'Format: 1-2 sentence summary, then bullet points. Max 6 bullets. No fluff.',
    'Never say you cannot access data — the data is in the context below.',
    'If you spot a problem, name it clearly. If there is an action, state it precisely.',
  ].join(' ')

  const userPrompt = [
    `Founder asked: "${originalMessage}"`,
    `Intent detected: ${intent}`,
    project ? `Focus product: ${project}` : '',
    '',
    'LIVE SYSTEM CONTEXT:',
    JSON.stringify(ctx, null, 2).slice(0, 6000), // stay within token budget
    '',
    'Respond now.',
  ].filter(Boolean).join('\n')

  const taskType =
    intent === 'fix_issue' ? 'reason'
    : intent === 'launch_plan' ? 'generate'
    : intent === 'growth_analysis' ? 'generate'
    : 'summarize'

  const { text, model } = await callInference(taskType, systemPrompt, userPrompt)

  if (!text) {
    // Graceful fallback: use deterministic context
    return buildDeterministicReply(intent, ctx, project)
  }

  // Parse LLM output into title + lines
  const rawLines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
  const title = rawLines[0]?.replace(/^#+\s*/, '').replace(/\*\*/g, '').slice(0, 80)
    || `${intent.replace(/_/g, ' ')} — ${project ?? 'Pranix'}`
  const lines = rawLines
    .slice(1)
    .map((l: string) => l.replace(/^[-•*]\s*/, ''))
    .filter((l: string) => l.length > 3)
    .slice(0, 8)

  const linkMap: Record<IntentKind, { link: string; label: string } | undefined> = {
    audit_product: { link: '/founder/products', label: 'Open Products' },
    fix_issue: { link: '/founder/tasks', label: 'Open Tasks' },
    growth_analysis: { link: '/founder/products', label: 'Open Products' },
    launch_plan: { link: '/founder/readiness', label: 'Open Readiness' },
    infrastructure_check: { link: '/founder/workers', label: 'Open Workers' },
    approvals_check: { link: '/founder/approvals', label: 'Open Approvals' },
    memory_search: { link: '/founder/memory', label: 'Open Memory' },
    provider_health: { link: '/founder/orchestrate', label: 'Open Orchestration' },
    deployment_status: { link: '/founder/products', label: 'Open Products' },
    agent_status: { link: '/founder/workers', label: 'Open Workers' },
    open_console: undefined,
    action_requested: { link: '/founder/approvals', label: 'Open Approvals' },
    free_form: { link: '/founder/products', label: 'Open Products' },
  }

  const nav = linkMap[intent]
  return { title, lines, link: nav?.link, link_label: nav?.label, model_used: model }
}

// ─── Deterministic fallback (no LLM available) ───────────────────

function buildDeterministicReply(
  intent: IntentKind,
  ctx: Record<string, any>,
  project?: string,
): { title: string; lines: string[]; link?: string; link_label?: string } {
  switch (intent) {
    case 'audit_product': {
      const p = ctx.focusProduct
      if (!p) return { title: `${project ?? 'Product'} not found`, lines: ['Product not registered.'], link: '/founder/products', link_label: 'Open Products' }
      return {
        title: p.project_name,
        lines: [
          `Type: ${p.product_type}`,
          `Tier: ${p.account_tier}`,
          `Deployment: ${p.deployment_health ?? 'unknown'}`,
          ctx.failures?.length ? `${ctx.failures.length} failure pattern(s) detected.` : 'No failure patterns.',
          ctx.alerts?.length ? `${ctx.alerts.length} active alert(s).` : 'No critical alerts.',
        ],
        link: '/founder/products', link_label: 'Open Products',
      }
    }
    case 'growth_analysis': {
      const products: any[] = ctx.products ?? []
      const lines = products.slice(0, 5).map((p: any) =>
        `${p.project_name}: ${p.deployment_health ?? 'unknown'} — ${p.account_tier}`
      )
      if (!lines.length) lines.push('No products registered yet.')
      return { title: 'Product Overview', lines, link: '/founder/products', link_label: 'Open Products' }
    }
    case 'infrastructure_check': {
      const counts = ctx.taskCounts ?? {}
      return {
        title: 'Infrastructure Status',
        lines: [
          counts.dead > 0 ? `${counts.dead} failed task(s).` : 'No failed tasks.',
          ctx.alerts?.length ? `${ctx.alerts.length} critical alert(s).` : 'No critical alerts.',
          ctx.failures?.length ? `Recurring failures: ${ctx.failures.slice(0,3).map((f: any) => f.failure_type).join(', ')}` : 'No recurring failures.',
        ],
        link: '/founder/workers', link_label: 'Open Workers',
      }
    }
    default:
      return {
        title: 'Pranix System',
        lines: ['Live data read. Ask me anything about your products, infrastructure, or growth.'],
        link: '/founder/products', link_label: 'Open Products',
      }
  }
}

// ─── Auth helper ─────────────────────────────────────────────────

async function assertFounder(): Promise<{ ok: true; email: string } | { ok: false }> {
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

// ─── Console links ────────────────────────────────────────────────

const CONSOLES: { keys: string[]; label: string; url: string }[] = [
  { keys: ['supabase'], label: 'Open Supabase', url: 'https://supabase.com/dashboard/projects' },
  { keys: ['vercel'], label: 'Open Vercel', url: 'https://vercel.com/dashboard' },
  { keys: ['github'], label: 'Open GitHub', url: 'https://github.com/PranixQuick' },
  { keys: ['doppler', 'secret'], label: 'Open Doppler', url: 'https://dashboard.doppler.com' },
  { keys: ['razorpay', 'payment'], label: 'Open Razorpay', url: 'https://dashboard.razorpay.com' },
]

async function routeToPermissionCenter(message: string, email: string): Promise<Reply> {
  const cp = getControlPlane()
  const { data: fc } = await cp.from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()
  const scope = /\b(view|read|show|list)\b/.test(message.toLowerCase()) ? 'test' : 'write'
  const { error } = await cp.from('mcp_access_grants').insert({
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
  })
  if (error) {
    return { kind: 'error', title: 'Could not route request', lines: ['Please try from the Approvals screen.'], link: '/founder/approvals', link_label: 'Open Approvals' }
  }
  return {
    kind: 'approval_routed',
    title: 'Queued for your approval',
    lines: [
      'This action needs your sign-off before anything changes.',
      'I\'ve created a request in your Approvals Center. Review it there.',
    ],
    link: '/founder/approvals',
    link_label: 'Review in Approvals',
  }
}

// ─── Main handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  const gate = await assertFounder()
  if (!gate.ok) {
    return NextResponse.json(
      { reply: { kind: 'error', title: 'Not signed in', lines: ['Please sign in to use Ask Pranix.'] } as Reply },
      { status: 401 }
    )
  }

  let message = ''
  let preferredModel: string | undefined
  try {
    const body = await req.json()
    message = String(body?.message ?? '').slice(0, 2000)
    preferredModel = body?.model // optional: 'auto' | 'groq' | 'gemini' | 'openrouter'
  } catch { /* ignore */ }

  const q = message.toLowerCase().trim()
  if (!q) {
    return NextResponse.json({
      reply: {
        kind: 'help',
        title: 'Ask me anything about Pranix',
        lines: [
          'Try: "Review Cart2Save" or "Why is SchoolOS growth slow?"',
          'Or: "Improve affiliate automation" or "Prepare QuickScanz launch"',
          'Or: "What should I focus on?" or "Fix checkout issues"',
          'Anything that changes settings is routed to your Approvals Center first.',
        ],
      } as Reply,
    })
  }

  try {
    // 1. Classify intent
    const { intent, project } = classifyIntent(q)

    // 2. Action gate — route to approval, never execute
    if (intent === 'action_requested') {
      const w = await requireWritableFounder()
      if (w instanceof NextResponse) {
        return NextResponse.json({
          reply: { kind: 'info', title: 'Read-only account', lines: ['This account has read-only access.'] } as Reply,
        })
      }
      const reply = await routeToPermissionCenter(message, gate.email)
      return NextResponse.json({ reply })
    }

    // 3. Console shortcut (no data needed)
    if (intent === 'open_console') {
      const hit = CONSOLES.find(c => c.keys.some(k => q.includes(k)))
      if (hit) {
        return NextResponse.json({
          reply: {
            kind: 'console',
            title: hit.label.replace('Open ', '') + ' Console',
            lines: ['Opens in a new tab.'],
            link: hit.url,
            link_label: hit.label,
            intent,
          } as Reply,
        })
      }
    }

    // 4. Build execution plan
    const plan = buildPlan(intent, project)

    // 5. Collect live context from all required data sources in parallel
    const ctx = await collectContext(intent, project)

    // 6. LLM synthesis with live context injected
    const { title, lines, link, link_label, model_used } = await synthesise(
      message, intent, ctx, project
    )

    const reply: Reply = {
      kind: 'llm',
      title,
      lines,
      link,
      link_label,
      intent,
      plan: plan.map(s => ({ ...s, status: 'done' as const })),
      model_used,
    }

    return NextResponse.json({ reply })

  } catch {
    return NextResponse.json({
      reply: {
        kind: 'error',
        title: 'Something went wrong',
        lines: ['I couldn\'t complete that request. Please try again.'],
      } as Reply,
    })
  }
}
