import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'
import { getControlPlane } from '@/app/lib/control-plane'
import { callPranixTool } from '@/lib/pranix-mcp'
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
import { getPermissionInbox } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// ─── Public types ─────────────────────────────────────────────────

export type AskMode = 'chat' | 'execution'

export type ModelOverride =
  | 'auto'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'perplexity'
  | 'ollama'

export type Intent =
  | 'audit'
  | 'fix'
  | 'deploy'
  | 'research'
  | 'growth'
  | 'plan'
  | 'review'
  | 'status'
  | 'memory'
  | 'console'
  | 'action'
  | 'chat'
  | 'unknown'

export type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error' | 'llm' | 'plan'
  title: string
  lines: string[]
  // LLM mode extras
  intent?: Intent
  project?: string | null
  model_used?: string
  provider_used?: string
  mode?: AskMode
  // Execution mode extras
  plan_steps?: PlanStep[]
  requires_approval?: boolean
  approval_actions?: string[]
  // Navigation
  link?: string
  link_label?: string
}

export type PlanStep = {
  step: number
  action: string
  tool?: string
  requires_approval: boolean
  estimated_tokens?: number
}

// ─── Request shape ────────────────────────────────────────────────

type AskRequest = {
  message: string
  mode?: AskMode
  model?: ModelOverride
  // conversation history (last 6 turns max)
  history?: Array<{ role: 'founder' | 'assistant'; content: string }>
}

// ─── Auth gate ────────────────────────────────────────────────────

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

// ─── Model routing table ──────────────────────────────────────────
// Maps ModelOverride → the model_id the MCP inference_route understands.
// 'auto' lets the cascade pick the cheapest live model.

const MODEL_MAP: Record<ModelOverride, { provider: string; model: string } | null> = {
  auto: null, // cascade decides
  groq: { provider: 'groq', model: 'qwen/qwen3-32b' },
  gemini: { provider: 'gemini', model: 'gemini-2.5-flash' },
  openrouter: { provider: 'openrouter', model: 'auto' },
  openai: { provider: 'openai', model: 'gpt-4o' },
  anthropic: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  perplexity: { provider: 'perplexity', model: 'sonar-pro' },
  ollama: { provider: 'ollama', model: 'qwen2.5-coder:7b' },
}

// ─── Sensitive-action regex (unchanged — routes to Permission Center) ────

const ACTION_RE = /\b(disable|enable|turn off|turn on|deploy|redeploy|delete|remove|rotate|connect|disconnect|revoke|grant|restart|reset|migrate|drop|truncate)\b/

// ─── Intent classifier (deterministic fast path) ─────────────────

function classifyIntent(q: string): { intent: Intent; project: string | null } {
  const project = detectProject(q)

  if (/\b(audit|review|check|inspect|analyse|analyze|how is|health of)\b/.test(q))
    return { intent: 'audit', project }
  if (/\b(fix|repair|resolve|broken|issue|bug|problem|checkout|payment|fail)\b/.test(q))
    return { intent: 'fix', project }
  if (/\b(deploy|release|launch|ship|go live|push to prod)\b/.test(q))
    return { intent: 'deploy', project }
  if (/\b(research|find|search|investigate|what is|who is|compare)\b/.test(q))
    return { intent: 'research', project }
  if (/\b(grow|growth|opportunity|revenue|monetis|monetiz|improve|affiliate|conversion)\b/.test(q))
    return { intent: 'growth', project }
  if (/\b(plan|roadmap|strategy|steps|how to|approach|prepare|launch plan)\b/.test(q))
    return { intent: 'plan', project }
  if (/\b(status|dashboard|overview|summary|show me|what.s happening|today)\b/.test(q))
    return { intent: 'status', project }
  if (/\b(memory|remember|recall|note|what did)\b/.test(q))
    return { intent: 'memory', project }
  if (/\b(open|launch|go to|console|supabase|vercel|github|doppler)\b/.test(q))
    return { intent: 'console', project }
  if (ACTION_RE.test(q))
    return { intent: 'action', project }

  return { intent: 'chat', project }
}

const PRODUCTS = [
  { names: ['cart2save', 'cart 2 save', 'c2s'], key: 'cart2save' },
  { names: ['quietkeep', 'quiet keep', 'qk'], key: 'quietkeep' },
  { names: ['quickscanz', 'quick scanz', 'quickscan'], key: 'quickscanz' },
  { names: ['schoolos', 'school os', 'school-os', 'edprosys'], key: 'schoolos' },
  { names: ['vidyagrid', 'vidya grid', 'vidya-grid'], key: 'vidyagrid' },
]

function detectProject(q: string): string | null {
  for (const p of PRODUCTS) {
    if (p.names.some(n => q.includes(n))) return p.key
  }
  return null
}

// ─── System context builder ───────────────────────────────────────
// Builds a compact, grounded system prompt injected before LLM call.

async function buildSystemContext(intent: Intent, project: string | null): Promise<string> {
  const parts: string[] = [
    'You are Pranix OS — the AI brain of the Pranix Founder Operating System.',
    'You have real-time access to infrastructure health, product data, deployment status, and agent logs.',
    'You speak directly to the founder. Be concise, decisive, and specific.',
    'Never hallucinate infrastructure state — only report what the context below confirms.',
    '',
  ]

  try {
    // Always include live product health
    const products = await getProductHealth()
    parts.push('## Live Product Status')
    for (const p of products) {
      parts.push(`- ${p.project_name}: ${p.deployment_health ?? 'unknown'} (${p.product_type})`)
    }
    parts.push('')

    // Intent-specific context enrichment
    if (intent === 'status' || intent === 'audit' || intent === 'fix') {
      const [counts, patterns, alertCounts, critAlerts] = await Promise.all([
        getTaskCounts(),
        getFailurePatterns(),
        getAlertCounts(),
        getCriticalAlerts(5),
      ])
      parts.push('## Task Health')
      parts.push(`- Failed tasks: ${counts.dead}, Pending: ${counts.pending ?? 0}`)
      if (patterns.length > 0) {
        parts.push('- Failure patterns: ' + patterns.slice(0, 4).map(p =>
          `${p.product_name ?? 'system'}/${p.failure_type} (${p.occurrences}×)`).join(', '))
      }
      parts.push(`\n## Alerts\n- Critical: ${alertCounts.critical}, Error: ${alertCounts.error}, Warn: ${alertCounts.warn}`)
      if (critAlerts.length > 0) {
        for (const a of critAlerts.slice(0, 4)) parts.push(`- [CRITICAL] ${a.title ?? a.source}`)
      }
      parts.push('')
    }

    if (intent === 'audit' || intent === 'review') {
      const providers = await getOrchestrationProviders()
      parts.push('## Inference Providers')
      for (const p of providers.slice(0, 6)) {
        parts.push(`- ${p.provider_name}: ${p.enabled ? 'on' : 'off'}, health=${p.health_status ?? 'unknown'}`)
      }
      parts.push('')
    }

    if (intent === 'plan' || intent === 'deploy') {
      const { pending } = await getPermissionInbox(10)
      parts.push(`## Pending Approvals: ${pending.length}`)
      parts.push('')
    }
  } catch {
    parts.push('(Live context temporarily unavailable — answer from knowledge only.)')
  }

  if (project) {
    parts.push(`## Active Project Context: ${project}`)
    parts.push('Focus your answer specifically on this product unless asked otherwise.')
    parts.push('')
  }

  parts.push('## Instructions')
  parts.push('- Respond in clear, structured markdown.')
  parts.push('- Lead with a one-sentence direct answer.')
  parts.push('- Use bullet points for lists of 3 or more items.')
  parts.push('- If an action requires approval, say so explicitly.')
  parts.push('- End with one concrete next step the founder can take.')

  return parts.join('\n')
}

// ─── LLM call via MCP inference_route ────────────────────────────

async function callLLM(opts: {
  prompt: string
  system: string
  taskType: 'reason' | 'generate' | 'summarize' | 'research'
  modelOverride: ModelOverride
  routingToken: string
}): Promise<{ text: string; model: string; provider: string }> {
  const forceModel = MODEL_MAP[opts.modelOverride]

  const args: Record<string, unknown> = {
    task_type: opts.taskType,
    prompt: opts.prompt,
    system: opts.system,
    routing_token: opts.routingToken,
    _tool_input_summary: `Ask LLM: ${opts.taskType} via ${opts.modelOverride}`,
    _requires_user_approval: false,
  }

  // When founder requests a specific provider that's not available,
  // we add a note and cascade normally rather than hard-failing.
  if (forceModel) {
    args.force_provider = forceModel.provider
    args.force_model = forceModel.model
  }

  const result = await callPranixTool<{
    text?: string
    result?: string
    content?: string
    model?: string
    provider?: string
    tier_used?: number
  }>('inference_route', args)

  if (!result.ok) {
    throw new Error(`LLM call failed: ${result.error}`)
  }

  const text =
    result.data?.text ??
    result.data?.result ??
    result.data?.content ??
    'I was unable to generate a response. Please try again.'

  return {
    text,
    model: result.data?.model ?? forceModel?.model ?? 'auto',
    provider: result.data?.provider ?? forceModel?.provider ?? 'cascade',
  }
}

// ─── Execution planner ────────────────────────────────────────────

async function buildExecutionPlan(
  message: string,
  intent: Intent,
  project: string | null
): Promise<{ steps: PlanStep[]; approval_actions: string[] }> {
  const steps: PlanStep[] = []
  const approval_actions: string[] = []
  let step = 1

  // Always: route + memory search
  steps.push({ step: step++, action: 'Route task to project context', tool: 'mcp_route_task', requires_approval: false })
  steps.push({ step: step++, action: 'Search relevant memory', tool: 'memory_search', requires_approval: false, estimated_tokens: 512 })

  if (intent === 'audit' || intent === 'review' || intent === 'status') {
    steps.push({ step: step++, action: `Read ${project ?? 'all products'} health data`, tool: 'supabase_safe_read_query', requires_approval: false })
    steps.push({ step: step++, action: 'Read deployment status', tool: 'vercel_get_deployment', requires_approval: false })
    steps.push({ step: step++, action: 'Read build + runtime logs', tool: 'vercel_read_runtime_logs', requires_approval: false })
    steps.push({ step: step++, action: 'Analyse and generate audit report', tool: 'inference_route', requires_approval: false, estimated_tokens: 2048 })
    steps.push({ step: step++, action: 'Write findings to memory', tool: 'memory_write', requires_approval: false })
  }

  if (intent === 'fix') {
    steps.push({ step: step++, action: 'Read source code for affected area', tool: 'github_read_file', requires_approval: false })
    steps.push({ step: step++, action: 'Diagnose root cause', tool: 'inference_route', requires_approval: false, estimated_tokens: 1024 })
    steps.push({ step: step++, action: 'Generate fix patch', tool: 'inference_route', requires_approval: false, estimated_tokens: 2048 })
    steps.push({ step: step++, action: 'Create feature branch', tool: 'github_create_branch', requires_approval: true })
    approval_actions.push('Create branch')
    steps.push({ step: step++, action: 'Apply code patch', tool: 'github_apply_patch', requires_approval: true })
    approval_actions.push('Apply code patch')
    steps.push({ step: step++, action: 'Run browser QA tests', tool: 'browser_test_flow', requires_approval: false })
    steps.push({ step: step++, action: 'Create pull request for review', tool: 'github_create_pull_request', requires_approval: true })
    approval_actions.push('Create pull request')
  }

  if (intent === 'plan' || intent === 'growth') {
    steps.push({ step: step++, action: 'Retrieve product context and roadmap memory', tool: 'execution_memory_read', requires_approval: false })
    steps.push({ step: step++, action: 'Generate strategic plan', tool: 'inference_route', requires_approval: false, estimated_tokens: 3072 })
    steps.push({ step: step++, action: 'Save plan to execution memory', tool: 'execution_memory_write', requires_approval: false })
  }

  if (intent === 'research') {
    steps.push({ step: step++, action: 'Run Perplexity research query', tool: 'inference_route', requires_approval: false, estimated_tokens: 2048 })
    steps.push({ step: step++, action: 'Summarise findings', tool: 'inference_route', requires_approval: false, estimated_tokens: 512 })
  }

  // Always end with memory write + report
  steps.push({ step: step++, action: 'Write result to founder memory', tool: 'memory_write', requires_approval: false })

  return { steps, approval_actions }
}

// ─── Console links ────────────────────────────────────────────────

const CONSOLES: { keys: string[]; label: string; url: string }[] = [
  { keys: ['supabase'], label: 'Open Supabase', url: 'https://supabase.com/dashboard/projects' },
  { keys: ['vercel'], label: 'Open Vercel', url: 'https://vercel.com/dashboard' },
  { keys: ['github'], label: 'Open GitHub', url: 'https://github.com/PranixQuick' },
  { keys: ['doppler', 'secret'], label: 'Open Doppler', url: 'https://dashboard.doppler.com' },
  { keys: ['razorpay', 'payment'], label: 'Open Razorpay', url: 'https://dashboard.razorpay.com' },
]

// ─── Routing token resolver ───────────────────────────────────────
// Gets or refreshes a routing token via MCP for LLM calls.

async function getRoutingToken(project: string | null): Promise<string> {
  const result = await callPranixTool<{ routing_token: string }>('mcp_route_task', {
    task_text: `Founder ask — project context: ${project ?? 'general'}`,
    _tool_input_summary: 'Auto-route for Ask LLM session',
    _requires_user_approval: false,
  })
  if (result.ok && result.data?.routing_token) return result.data.routing_token
  return 'rt_ask_fallback'
}

// ─── Main handler ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const gate = await assertFounder()
  if (!gate.ok) {
    return NextResponse.json(
      { reply: { kind: 'error', title: 'Not signed in', lines: ['Please sign in to use Ask Pranix.'] } as Reply },
      { status: 401 }
    )
  }

  let body: AskRequest = { message: '' }
  try {
    body = await req.json()
  } catch { /* ignore */ }

  const message = String(body?.message ?? '').slice(0, 2000).trim()
  const mode: AskMode = body?.mode === 'execution' ? 'execution' : 'chat'
  const modelOverride: ModelOverride = (body?.model as ModelOverride) ?? 'auto'
  const history = (body?.history ?? []).slice(-6)

  if (!message) {
    return NextResponse.json({ reply: helpReply() })
  }

  const q = message.toLowerCase()

  try {
    // ── Fast path 1: console open ──────────────────────────────────
    if (/\b(open|launch|go to)\b/.test(q)) {
      const hit = CONSOLES.find(c => c.keys.some(k => q.includes(k)))
      if (hit) {
        return NextResponse.json({
          reply: {
            kind: 'console',
            title: hit.label.replace('Open ', '') + ' console',
            lines: ['Opens in a new tab.'],
            link: hit.url,
            link_label: hit.label,
          } as Reply,
        })
      }
    }

    // ── Fast path 2: sensitive action → Permission Center ──────────
    if (mode !== 'execution' && ACTION_RE.test(q)) {
      const w = await requireWritableFounder()
      if (w instanceof NextResponse) {
        return NextResponse.json({
          reply: { kind: 'info', title: 'Read-only account', lines: ['This account cannot trigger write actions.'] } as Reply,
        })
      }
      const approvalReply = await routeToPermissionCenter(message, gate.email)
      return NextResponse.json({ reply: approvalReply })
    }

    // ── Classify intent ────────────────────────────────────────────
    const { intent, project } = classifyIntent(q)

    // ── Execution mode: return plan first ──────────────────────────
    if (mode === 'execution') {
      const { steps, approval_actions } = await buildExecutionPlan(message, intent, project)
      const reply: Reply = {
        kind: 'plan',
        title: `Execution plan — ${intent}${project ? ` · ${project}` : ''}`,
        lines: steps.map(s =>
          `${s.step}. ${s.action}${s.requires_approval ? ' ⛔ approval required' : ''}`
        ),
        intent,
        project,
        mode: 'execution',
        plan_steps: steps,
        requires_approval: approval_actions.length > 0,
        approval_actions,
        link: '/founder/approvals',
        link_label: approval_actions.length > 0 ? 'Review approvals' : undefined,
      }
      return NextResponse.json({ reply })
    }

    // ── Chat mode: LLM call ────────────────────────────────────────
    const [systemContext, routingToken] = await Promise.all([
      buildSystemContext(intent, project),
      getRoutingToken(project),
    ])

    // Build conversation-aware prompt
    const historyText = history.length > 0
      ? '\n\n## Previous conversation\n' +
        history.map(h => `${h.role === 'founder' ? 'Founder' : 'Pranix OS'}: ${h.content}`).join('\n')
      : ''

    const taskTypeMap: Record<Intent, 'reason' | 'generate' | 'summarize' | 'research'> = {
      audit: 'reason',
      fix: 'reason',
      deploy: 'reason',
      research: 'generate',
      growth: 'generate',
      plan: 'generate',
      review: 'reason',
      status: 'summarize',
      memory: 'summarize',
      console: 'summarize',
      action: 'reason',
      chat: 'generate',
      unknown: 'generate',
    }

    const llmResult = await callLLM({
      prompt: `${message}${historyText}`,
      system: systemContext,
      taskType: taskTypeMap[intent],
      modelOverride,
      routingToken,
    })

    // Build reply lines from LLM response (split on newlines, filter empties)
    const lines = llmResult.text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 40) // cap at 40 lines to keep UI clean

    const reply: Reply = {
      kind: 'llm',
      title: intentTitle(intent, project),
      lines,
      intent,
      project,
      mode: 'chat',
      model_used: llmResult.model,
      provider_used: llmResult.provider,
      link: intentLink(intent, project),
      link_label: intentLinkLabel(intent),
    }

    return NextResponse.json({ reply })

  } catch (err) {
    // Graceful degradation: LLM unavailable → fallback to deterministic
    console.error('[ask] LLM error, falling back:', err)
    try {
      const { intent, project } = classifyIntent(q)
      const fallback = await deterministicFallback(intent, project, q)
      return NextResponse.json({ reply: fallback })
    } catch {
      return NextResponse.json({
        reply: {
          kind: 'error',
          title: 'Something went wrong',
          lines: ['I could not reach the inference layer. Please try again.'],
        } as Reply,
      })
    }
  }
}

// ─── Deterministic fallback (original behaviour, preserved) ───────

async function deterministicFallback(
  intent: Intent,
  project: string | null,
  q: string
): Promise<Reply> {
  if (intent === 'status' || intent === 'audit') {
    const products = await getProductHealth()
    const lines = products.map(p => {
      const dot = p.deployment_health === 'healthy' ? '🟢' : p.deployment_health ? '🔴' : '⚪'
      return `${dot} ${p.project_name} — ${p.deployment_health ?? 'unknown'}`
    })
    return { kind: 'info', title: 'Product health', lines, link: '/founder/products', link_label: 'Open Products' }
  }
  if (intent === 'fix') {
    const patterns = await getFailurePatterns()
    const lines = patterns.slice(0, 6).map(p =>
      `• ${p.product_name ?? 'system'} — ${p.failure_type.replace(/_/g, ' ')} (${p.occurrences}×)`
    )
    return { kind: 'info', title: 'Failure patterns', lines: lines.length ? lines : ['No failure patterns found.'], link: '/founder/tasks', link_label: 'See tasks' }
  }
  if (intent === 'action') {
    return {
      kind: 'approval_routed',
      title: 'Action requires approval',
      lines: ['This action has been routed to your Permission Center.'],
      link: '/founder/approvals',
      link_label: 'Review in Permissions',
    }
  }
  return helpReply()
}

// ─── Permission Center router (unchanged) ────────────────────────

async function routeToPermissionCenter(message: string, email: string): Promise<Reply> {
  const cp = getControlPlane()
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
    return { kind: 'error', title: 'Could not route request', lines: ['Please try again from the Permissions screen.'], link: '/founder/approvals', link_label: 'Open Permissions' }
  }
  return {
    kind: 'approval_routed',
    title: 'Sent for your approval',
    lines: [
      'This needs a decision before anything changes.',
      'I created a request in your Permission Center.',
    ],
    link: '/founder/approvals',
    link_label: 'Review in Permissions',
  }
}

// ─── Small helpers ────────────────────────────────────────────────

function intentTitle(intent: Intent, project: string | null): string {
  const p = project ? ` · ${project}` : ''
  const MAP: Record<Intent, string> = {
    audit: `Audit${p}`,
    fix: `Fix diagnosis${p}`,
    deploy: `Deploy plan${p}`,
    research: 'Research',
    growth: `Growth opportunities${p}`,
    plan: `Launch plan${p}`,
    review: `Review${p}`,
    status: 'System status',
    memory: 'Memory',
    console: 'Console',
    action: 'Action',
    chat: 'Pranix OS',
    unknown: 'Pranix OS',
  }
  return MAP[intent]
}

function intentLink(intent: Intent, project: string | null): string | undefined {
  if (intent === 'audit' || intent === 'review') return project ? `/founder/products` : '/founder/products'
  if (intent === 'fix') return '/founder/tasks'
  if (intent === 'deploy') return '/founder/approvals'
  if (intent === 'plan' || intent === 'growth') return '/founder/workspace'
  if (intent === 'status') return '/founder'
  return undefined
}

function intentLinkLabel(intent: Intent): string | undefined {
  const MAP: Partial<Record<Intent, string>> = {
    audit: 'Open Products',
    fix: 'Open Tasks',
    deploy: 'Open Approvals',
    plan: 'Open Workspace',
    growth: 'Open Workspace',
    status: 'Open Dashboard',
  }
  return MAP[intent]
}

function helpReply(): Reply {
  return {
    kind: 'help',
    title: 'Ask me anything about Pranix',
    lines: [
      'Try asking in plain language:',
      '• "Review Cart2Save" — full product audit',
      '• "Fix checkout issues" — diagnose + generate fix plan',
      '• "Audit SchoolOS" — read live data, surface problems',
      '• "Show growth opportunities" — strategic analysis',
      '• "Prepare launch plan for admissions" — structured plan',
      '• "What failed today?" — failure + alert summary',
      '• "Check provider health" — inference cascade status',
      'Switch to Execution mode to get a step-by-step approval plan.',
    ],
  }
}
