import 'server-only'

import { callPranixTool } from '@/lib/pranix-mcp'
import { getControlPlane } from '@/app/lib/control-plane'

// ─── Types ──────────────────────────────────────────────────────────

export type TaskType =
  | 'coding'
  | 'research'
  | 'architecture'
  | 'mobile'
  | 'background'
  | 'audit'
  | 'deployment'
  | 'reasoning'
  | 'summarise'
  | 'generate'

export type FounderMode = 'advisor' | 'operator' | 'autonomous' | 'founder_os'

export type RoutedModel = {
  provider: string
  model_id: string
  rationale: string
  cost_tier: 'free' | 'low' | 'medium' | 'high'
  speed_tier: 'fast' | 'medium' | 'slow'
  requires_approval: boolean
}

export type ExecutionResult = {
  ok: boolean
  task_type: TaskType
  model: RoutedModel
  output?: string
  error?: string
  tokens_used?: number
  latency_ms?: number
  memory_key?: string
  audit_id?: string
}

export type ApprovalRequest = {
  action: string
  resource_pattern: string
  scope: 'read' | 'test' | 'write' | 'admin'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  ttl_minutes?: number
  context?: string
}

export type ApprovalResult = {
  routed: boolean
  grant_id?: string
  message: string
}

export type MemoryEntry = {
  project: string
  key: string
  value: Record<string, unknown>
  scope?: 'semantic' | 'episodic'
  salience?: number
  ttl_hours?: number
}

export type AuditEntry = {
  task_type: TaskType
  provider: string
  model: string
  tokens_used?: number
  latency_ms?: number
  ok: boolean
  error?: string
  founder_mode: FounderMode
  project?: string
  created_at: string
}

// ─── Model Registry ───────────────────────────────────────────────
// Static registry of all supported models.
// Live availability is checked dynamically; this is the desired-state manifest.

const MODEL_REGISTRY: Record<string, RoutedModel & { task_types: TaskType[] }> = {
  // ─ Anthropic ────────────────────────────────────────────
  'anthropic/claude-sonnet-4-5': {
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-5',
    rationale: 'Best overall reasoning and coding. Handles complex multi-step tasks.',
    cost_tier: 'high',
    speed_tier: 'medium',
    requires_approval: false,
    task_types: ['coding', 'architecture', 'reasoning', 'audit'],
  },
  'anthropic/claude-haiku-3-5': {
    provider: 'anthropic',
    model_id: 'claude-haiku-3-5',
    rationale: 'Fast and cheap Claude for summarisation and simple tasks.',
    cost_tier: 'low',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['summarise', 'generate', 'background'],
  },
  // ─ Groq ──────────────────────────────────────────────────
  'groq/qwen3-32b': {
    provider: 'groq',
    model_id: 'qwen/qwen3-32b',
    rationale: 'Ultra-fast inference. Best for real-time chat and background jobs.',
    cost_tier: 'free',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['background', 'summarise', 'generate', 'coding'],
  },
  'groq/llama4-scout': {
    provider: 'groq',
    model_id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    rationale: 'Fast multimodal Llama 4. Good for mobile-context tasks.',
    cost_tier: 'free',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['mobile', 'generate', 'summarise'],
  },
  // ─ Gemini ───────────────────────────────────────────────
  'gemini/gemini-2.5-flash': {
    provider: 'gemini',
    model_id: 'gemini-2.5-flash',
    rationale: 'Excellent for mobile, multimodal, and Android-centric tasks.',
    cost_tier: 'low',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['mobile', 'generate', 'coding', 'summarise'],
  },
  'gemini/gemini-2.5-pro': {
    provider: 'gemini',
    model_id: 'gemini-2.5-pro',
    rationale: 'Deep reasoning and long-context. Use for architecture and research.',
    cost_tier: 'high',
    speed_tier: 'slow',
    requires_approval: false,
    task_types: ['architecture', 'research', 'reasoning'],
  },
  // ─ OpenRouter ───────────────────────────────────────────
  'openrouter/auto': {
    provider: 'openrouter',
    model_id: 'auto',
    rationale: 'Fallback when primary providers are unavailable. Routes to cheapest capable model.',
    cost_tier: 'low',
    speed_tier: 'medium',
    requires_approval: false,
    task_types: ['coding', 'generate', 'summarise', 'background', 'research'],
  },
  // ─ Perplexity ──────────────────────────────────────────
  'perplexity/sonar-pro': {
    provider: 'perplexity',
    model_id: 'sonar-pro',
    rationale: 'Real-time web-grounded research. Best for market research and news.',
    cost_tier: 'medium',
    speed_tier: 'medium',
    requires_approval: false,
    task_types: ['research'],
  },
  // ─ Ollama (on-device) ────────────────────────────────────
  'ollama/qwen2.5-coder': {
    provider: 'ollama',
    model_id: 'qwen2.5-coder:7b',
    rationale: 'Free local coding model. Zero cost, zero egress. Use for background code tasks.',
    cost_tier: 'free',
    speed_tier: 'medium',
    requires_approval: false,
    task_types: ['background', 'coding'],
  },
  'ollama/llama3.2': {
    provider: 'ollama',
    model_id: 'llama3.2:3b',
    rationale: 'Tiny local model. Use for ultra-cheap summarisation and classification.',
    cost_tier: 'free',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['background', 'summarise'],
  },
  // ─ OpenAI ────────────────────────────────────────────────
  'openai/gpt-4o': {
    provider: 'openai',
    model_id: 'gpt-4o',
    rationale: 'Excellent for architecture, multi-modal, and system design tasks.',
    cost_tier: 'high',
    speed_tier: 'medium',
    requires_approval: false,
    task_types: ['architecture', 'reasoning', 'coding', 'generate'],
  },
  'openai/gpt-4o-mini': {
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    rationale: 'Cost-effective OpenAI for bulk tasks. Good code comprehension.',
    cost_tier: 'low',
    speed_tier: 'fast',
    requires_approval: false,
    task_types: ['background', 'summarise', 'generate'],
  },
}

// ─── Routing priority tables ──────────────────────────────────────────
// Ordered preference: first available model wins.
// Falls back to openrouter/auto if all primaries unavailable.

const TASK_ROUTING: Record<TaskType, string[]> = {
  coding:       ['anthropic/claude-sonnet-4-5', 'ollama/qwen2.5-coder', 'openai/gpt-4o', 'openrouter/auto'],
  architecture: ['openai/gpt-4o', 'gemini/gemini-2.5-pro', 'anthropic/claude-sonnet-4-5', 'openrouter/auto'],
  research:     ['perplexity/sonar-pro', 'gemini/gemini-2.5-pro', 'openrouter/auto'],
  mobile:       ['gemini/gemini-2.5-flash', 'groq/llama4-scout', 'openrouter/auto'],
  background:   ['ollama/qwen2.5-coder', 'groq/qwen3-32b', 'openai/gpt-4o-mini', 'openrouter/auto'],
  audit:        ['anthropic/claude-sonnet-4-5', 'openai/gpt-4o', 'openrouter/auto'],
  deployment:   ['anthropic/claude-sonnet-4-5', 'openai/gpt-4o', 'openrouter/auto'],
  reasoning:    ['anthropic/claude-sonnet-4-5', 'gemini/gemini-2.5-pro', 'openai/gpt-4o', 'openrouter/auto'],
  summarise:    ['groq/qwen3-32b', 'anthropic/claude-haiku-3-5', 'openai/gpt-4o-mini', 'openrouter/auto'],
  generate:     ['groq/qwen3-32b', 'openai/gpt-4o', 'openrouter/auto'],
}

// ─── Founder mode gates ───────────────────────────────────────────
// Determines what the orchestrator is allowed to do autonomously.

const MODE_GATES: Record<FounderMode, {
  can_write_code: boolean
  can_create_branch: boolean
  can_create_pr: boolean
  can_deploy: boolean
  can_modify_secrets: boolean
  can_write_memory: boolean
  approval_threshold: 'all' | 'destructive' | 'none'
}> = {
  advisor: {
    can_write_code: false,
    can_create_branch: false,
    can_create_pr: false,
    can_deploy: false,
    can_modify_secrets: false,
    can_write_memory: true,
    approval_threshold: 'all',
  },
  operator: {
    can_write_code: true,
    can_create_branch: true,
    can_create_pr: false,
    can_deploy: false,
    can_modify_secrets: false,
    can_write_memory: true,
    approval_threshold: 'destructive',
  },
  autonomous: {
    can_write_code: true,
    can_create_branch: true,
    can_create_pr: true,
    can_deploy: false,
    can_modify_secrets: false,
    can_write_memory: true,
    approval_threshold: 'destructive',
  },
  founder_os: {
    can_write_code: true,
    can_create_branch: true,
    can_create_pr: true,
    can_deploy: true,
    can_modify_secrets: false, // secrets always need explicit approval
    can_write_memory: true,
    approval_threshold: 'none',
  },
}

// ─── Core: select_model ────────────────────────────────────────────
//
// Picks the best available model for a given task type.
// Checks live provider availability before committing.

export async function select_model(
  task: TaskType,
  mode: FounderMode = 'autonomous'
): Promise<RoutedModel> {
  const priority = TASK_ROUTING[task]

  // Try to get live provider states from the DB
  let liveProviders: Set<string> = new Set()
  try {
    const db = getControlPlane()
    const { data } = await db
      .from('provider_registry')
      .select('provider_name, enabled')
      .eq('enabled', true)
    if (data) {
      for (const p of data) liveProviders.add(p.provider_name)
    }
  } catch {
    // If we can't reach DB, try all models (cascade will handle it)
    liveProviders = new Set(Object.values(MODEL_REGISTRY).map(m => m.provider))
  }

  // Walk priority list and find first enabled model
  for (const key of priority) {
    const candidate = MODEL_REGISTRY[key]
    if (!candidate) continue
    // Ollama is always treated as available (local)
    if (candidate.provider === 'ollama' || liveProviders.has(candidate.provider)) {
      return { ...candidate }
    }
  }

  // Guaranteed fallback
  return MODEL_REGISTRY['openrouter/auto']
}

// ─── Core: execute_task ────────────────────────────────────────────
//
// Runs an inference task through the selected model.
// Handles retry (2 attempts) and automatic fallback to openrouter/auto.

export async function execute_task(opts: {
  task_type: TaskType
  prompt: string
  system?: string
  project?: string
  mode?: FounderMode
  routing_token: string
  max_retries?: number
}): Promise<ExecutionResult> {
  const mode = opts.mode ?? 'autonomous'
  const maxRetries = opts.max_retries ?? 2
  const started = Date.now()

  const model = await select_model(opts.task_type, mode)

  const inferenceArgs: Record<string, unknown> = {
    task_type: inferenceTaskType(opts.task_type),
    prompt: opts.prompt,
    routing_token: opts.routing_token,
    _tool_input_summary: `Orchestrator: ${opts.task_type} via ${model.provider}/${model.model_id}`,
    _requires_user_approval: false,
  }
  if (opts.system) inferenceArgs.system = opts.system
  if (model.provider !== 'cascade') {
    inferenceArgs.force_provider = model.provider
    inferenceArgs.force_model = model.model_id
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Fallback: switch to openrouter on retry
      inferenceArgs.force_provider = 'openrouter'
      inferenceArgs.force_model = 'auto'
      delete inferenceArgs.force_provider  // let cascade decide on 2nd retry
    }

    const result = await callPranixTool<{
      text?: string; result?: string; content?: string
      model?: string; provider?: string; tokens_used?: number
    }>('inference_route', inferenceArgs)

    if (result.ok) {
      const text = result.data?.text ?? result.data?.result ?? result.data?.content ?? ''
      const latency = Date.now() - started

      return {
        ok: true,
        task_type: opts.task_type,
        model,
        output: text,
        tokens_used: result.data?.tokens_used,
        latency_ms: latency,
      }
    }

    if (attempt + 1 >= maxRetries) {
      return {
        ok: false,
        task_type: opts.task_type,
        model,
        error: result.error,
        latency_ms: Date.now() - started,
      }
    }
  }

  // unreachable, but TypeScript needs it
  return { ok: false, task_type: opts.task_type, model, error: 'unknown' }
}

// ─── Core: request_approval ───────────────────────────────────────
//
// Routes a sensitive action to the Pranix Permission Center.
// Returns immediately — the founder approves asynchronously.

export async function request_approval(
  req: ApprovalRequest,
  founderId?: string
): Promise<ApprovalResult> {
  try {
    const db = getControlPlane()
    const { data: fc } = await db
      .from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()

    const row = {
      client_id: founderId ?? fc?.id ?? null,
      scope: req.scope,
      resource_pattern: req.resource_pattern,
      reason: req.context ?? `Orchestrator approval request: ${req.action}`,
      requested_task: req.action,
      grant_type: 'single' as const,
      risk_level: req.risk_level,
      granted_at: null as null,
      expires_at: new Date(
        Date.now() + (req.ttl_minutes ?? 60) * 60_000
      ).toISOString(),
      revoked_at: null as null,
    }

    const { data, error } = await db
      .from('mcp_access_grants')
      .insert(row)
      .select('id')
      .single()

    if (error) throw error

    return {
      routed: true,
      grant_id: data?.id,
      message: `Approval request created for: ${req.action}. Grant ID: ${data?.id}`,
    }
  } catch (err) {
    return {
      routed: false,
      message: err instanceof Error ? err.error : 'Failed to create approval request',
    }
  }
}

// ─── Core: write_memory ────────────────────────────────────────────
//
// Persists a result to both execution_memory (short-lived structured cache)
// and pranix_memory (long-lived semantic memory via MCP).

export async function write_memory(
  entry: MemoryEntry,
  routing_token: string
): Promise<{ execution_ok: boolean; semantic_ok: boolean; key: string }> {
  let execution_ok = false
  let semantic_ok = false

  // 1. execution_memory (structured, project-scoped, short-lived)
  const execResult = await callPranixTool<{ key: string }>('execution_memory_write', {
    project: entry.project,
    key: entry.key,
    value: entry.value,
    ttl_hours: entry.ttl_hours ?? 168,
    routing_token,
    _tool_input_summary: `Write execution memory: ${entry.project}/${entry.key}`,
    _requires_user_approval: false,
  })
  if (execResult.ok) execution_ok = true

  // 2. pranix_memory (semantic long-term memory, embedded for vector search)
  const content = typeof entry.value.summary === 'string'
    ? entry.value.summary
    : JSON.stringify(entry.value).slice(0, 1000)

  const memResult = await callPranixTool('memory_write', {
    project: entry.project,
    scope: entry.scope ?? 'episodic',
    content,
    salience: entry.salience ?? 5,
    source_kind: 'agent_output',
    source_ref: entry.key,
    routing_token,
    ttl_hours: entry.ttl_hours,
    _tool_input_summary: `Semantic memory: ${entry.project}/${entry.key}`,
    _requires_user_approval: false,
  })
  if (memResult.ok) semantic_ok = true

  return { execution_ok, semantic_ok, key: entry.key }
}

// ─── Core: audit_execution ──────────────────────────────────────────
//
// Writes an audit log entry to the control plane.
// Non-blocking — failures are swallowed to never break the happy path.

export async function audit_execution(
  entry: Omit<AuditEntry, 'created_at'>
): Promise<void> {
  try {
    const db = getControlPlane()
    await db.from('orchestration_audit_log').insert({
      task_type: entry.task_type,
      provider: entry.provider,
      model: entry.model,
      tokens_used: entry.tokens_used ?? null,
      latency_ms: entry.latency_ms ?? null,
      ok: entry.ok,
      error: entry.error ?? null,
      founder_mode: entry.founder_mode,
      project: entry.project ?? null,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Audit must never throw — it's a side-effect, not a gate
  }
}

// ─── Orchestrator public API ────────────────────────────────────────
// A convenience wrapper that orchestrates a single task end-to-end:
// select model → execute → write memory → audit.

export async function orchestrate(opts: {
  task_type: TaskType
  prompt: string
  system?: string
  project: string
  mode: FounderMode
  routing_token: string
  memory_key?: string
}): Promise<ExecutionResult & { memory_key?: string; audit_id?: string }> {
  const gate = MODE_GATES[opts.mode]

  const result = await execute_task({
    task_type: opts.task_type,
    prompt: opts.prompt,
    system: opts.system,
    project: opts.project,
    mode: opts.mode,
    routing_token: opts.routing_token,
  })

  // Write result to memory if permitted and execution succeeded
  let memory_key: string | undefined
  if (gate.can_write_memory && result.ok && result.output) {
    const key = opts.memory_key ?? `${opts.project}:${opts.task_type}:${Date.now()}`
    const memResult = await write_memory(
      {
        project: opts.project,
        key,
        value: {
          summary: result.output.slice(0, 500),
          task_type: opts.task_type,
          model: result.model.model_id,
          provider: result.model.provider,
          timestamp: new Date().toISOString(),
        },
        scope: 'episodic',
        salience: 6,
      },
      opts.routing_token
    )
    if (memResult.execution_ok) memory_key = key
  }

  // Audit every execution (fire and forget)
  void audit_execution({
    task_type: opts.task_type,
    provider: result.model.provider,
    model: result.model.model_id,
    tokens_used: result.tokens_used,
    latency_ms: result.latency_ms,
    ok: result.ok,
    error: result.error,
    founder_mode: opts.mode,
    project: opts.project,
  })

  return { ...result, memory_key }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function inferenceTaskType(
  t: TaskType
): 'classify' | 'code' | 'reason' | 'summarize' | 'extract' | 'generate' {
  const MAP: Record<TaskType, 'classify' | 'code' | 'reason' | 'summarize' | 'extract' | 'generate'> = {
    coding:       'code',
    architecture: 'reason',
    research:     'generate',
    mobile:       'code',
    background:   'generate',
    audit:        'reason',
    deployment:   'reason',
    reasoning:    'reason',
    summarise:    'summarize',
    generate:     'generate',
  }
  return MAP[t]
}

// ─── Model Registry export (for dashboard UI) ────────────────────

export function getModelRegistry() {
  return Object.entries(MODEL_REGISTRY).map(([key, m]) => ({
    registry_key: key,
    provider: m.provider,
    model_id: m.model_id,
    rationale: m.rationale,
    cost_tier: m.cost_tier,
    speed_tier: m.speed_tier,
    task_types: m.task_types,
  }))
}

export function getRoutingTable() {
  return Object.entries(TASK_ROUTING).map(([task, models]) => ({
    task_type: task as TaskType,
    priority: models,
  }))
}

export function getModeGates() {
  return Object.entries(MODE_GATES).map(([mode, gates]) => ({
    mode: mode as FounderMode,
    ...gates,
  }))
}
