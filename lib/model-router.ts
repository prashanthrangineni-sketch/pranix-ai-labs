/**
 * Pranix Model Router
 * 
 * Maps task intents to the best available model from the live model_registry.
 * Founder never needs to choose models manually; routing is automatic.
 *
 * Routing table (override with model_registry priority column):
 *   architecture / reasoning  -> GPT-4o (openai)
 *   coding / fix_issue        -> Claude (anthropic)
 *   research / analysis       -> Perplexity (perplexity)
 *   mobile / android          -> Gemini (google)
 *   background / cheap jobs   -> Ollama (local)
 *   fallback                  -> OpenRouter (openrouter)
 */

import { getControlPlane } from '@/app/lib/control-plane'

export type ModelTaskType =
  | 'reason'      // architecture, planning, synthesis
  | 'code'        // coding, fix, debugging
  | 'research'    // research, analysis, growth
  | 'generate'    // content, launch plans, reports
  | 'summarize'   // audit, infrastructure, quick answers
  | 'mobile'      // Android, iOS, on-device
  | 'background'  // cheap batch jobs, embeddings

export type RoutedModel = {
  model_id: string
  provider_name: string
  display_name: string
  cost_in_per_m: number | null
  is_free: boolean
  task_type: ModelTaskType
  routing_reason: string
  fallback: boolean
}

// ─── Static routing hints (live DB overrides these via priority column) ──

const STATIC_PROVIDER_HINTS: Record<ModelTaskType, string[]> = {
  reason:     ['openai', 'anthropic', 'openrouter'],
  code:       ['anthropic', 'openai', 'openrouter'],
  research:   ['perplexity', 'openai', 'openrouter'],
  generate:   ['anthropic', 'openai', 'openrouter'],
  summarize:  ['openai', 'groq', 'openrouter', 'anthropic'],
  mobile:     ['google', 'openai', 'openrouter'],
  background: ['ollama', 'groq', 'openrouter'],
}

// ─── Live resolver ─────────────────────────────────────────────────

export async function selectModel(
  taskType: ModelTaskType,
  preferredProvider?: string,
): Promise<RoutedModel | null> {
  const db = getControlPlane()

  // Fetch all enabled models for this task type, ordered by priority
  const { data: candidates } = await db
    .from('model_registry')
    .select('model_id, provider_name, display_name, cost_in_per_m, is_free, task_type, priority, enabled')
    .eq('task_type', taskType)
    .eq('enabled', true)
    .order('priority', { ascending: true })
    .limit(20)

  if (!candidates?.length) {
    // Fallback: any enabled model from preferred providers in static table
    return await fallbackModel(taskType)
  }

  // If founder explicitly picked a provider, honour it if available
  if (preferredProvider && preferredProvider !== 'auto') {
    const pref = candidates.find(m => m.provider_name.toLowerCase() === preferredProvider.toLowerCase())
    if (pref) {
      return { ...pref, task_type: taskType, routing_reason: `Founder selected: ${preferredProvider}`, fallback: false }
    }
  }

  // Pick best: lowest priority number (1 = highest priority)
  const best = candidates[0]
  return {
    ...best,
    task_type: taskType,
    routing_reason: `Auto-routed: ${taskType} → ${best.provider_name} (priority ${best.priority})`,
    fallback: false,
  }
}

async function fallbackModel(taskType: ModelTaskType): Promise<RoutedModel | null> {
  const db = getControlPlane()
  const providers = STATIC_PROVIDER_HINTS[taskType]

  for (const prov of providers) {
    const { data } = await db
      .from('model_registry')
      .select('model_id, provider_name, display_name, cost_in_per_m, is_free, task_type')
      .eq('provider_name', prov)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle()

    if (data) {
      return {
        ...data,
        task_type: taskType,
        routing_reason: `Static fallback: ${taskType} → ${prov}`,
        fallback: true,
      }
    }
  }

  // Last resort: any enabled model
  const { data: any } = await db
    .from('model_registry')
    .select('model_id, provider_name, display_name, cost_in_per_m, is_free, task_type')
    .eq('enabled', true)
    .limit(1)
    .maybeSingle()

  if (any) {
    return {
      ...any,
      task_type: taskType,
      routing_reason: 'Emergency fallback: any enabled model',
      fallback: true,
    }
  }

  return null
}

// ─── API route helper: GET /api/founder/models/router ───────────────

export async function getRoutingTable(): Promise<Record<ModelTaskType, RoutedModel | null>> {
  const types: ModelTaskType[] = ['reason', 'code', 'research', 'generate', 'summarize', 'mobile', 'background']
  const entries = await Promise.all(
    types.map(async t => [t, await selectModel(t)] as [ModelTaskType, RoutedModel | null])
  )
  return Object.fromEntries(entries) as Record<ModelTaskType, RoutedModel | null>
}

// ─── Intent to task type mapping ──────────────────────────────────

export function intentToTaskType(
  intent: string,
): ModelTaskType {
  const map: Record<string, ModelTaskType> = {
    audit_product:       'summarize',
    fix_issue:           'code',
    growth_analysis:     'research',
    launch_plan:         'generate',
    infrastructure_check:'summarize',
    approvals_check:     'summarize',
    memory_search:       'summarize',
    provider_health:     'summarize',
    deployment_status:   'summarize',
    agent_status:        'summarize',
    free_form:           'reason',
  }
  return map[intent] ?? 'reason'
}
