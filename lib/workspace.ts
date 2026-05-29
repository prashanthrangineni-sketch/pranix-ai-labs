import { getControlPlane } from '@/app/lib/control-plane'

// Phase F.1 — read-only Multi-AI Workspace data layer.
// Assembles five matrices from EXISTING registries only (no new tables, no writes).
// Reads via the service-role control plane; the /founder shell is founder-gated.

export type ProviderRow = {
  provider_name: string; tier: number | null; enabled: boolean
  priority: number | null; health_status: string | null; health_checked_at: string | null
}
export type HealthRow = {
  provider: string; status: string | null; last_success: string | null
  last_failure: string | null; failure_count: number | null; success_count: number | null
}
export type CapabilityRow = {
  agent_name: string; capability: string; action_name: string | null
  requires_approval: boolean; is_active: boolean
}
export type ModelRow = {
  provider_name: string; model_id: string; task_type: string | null
  cost_in_per_m: number | null; cost_out_per_m: number | null
  is_free: boolean; enabled: boolean; priority: number | null
}
export type CostRow = {
  provider: string; model: string; calls: number; cost_usd: number
  tokens_in: number; tokens_out: number; successes: number; failures: number
}
export type OnboardingRow = {
  provider_key: string; display_name: string | null; status: string
  validated_at: string | null; approved_at: string | null
}

export type Workspace = {
  providers: ProviderRow[]
  health: HealthRow[]
  capabilities: CapabilityRow[]
  models: ModelRow[]
  cost: CostRow[]
  costTotals: { calls: number; cost_usd: number; failures: number }
  onboarding: OnboardingRow[]
}

export async function getWorkspace(): Promise<Workspace> {
  const db = getControlPlane()
  const [provRes, healthRes, capRes, modelRes, logRes, onbRes] = await Promise.all([
    db.from('provider_registry').select('provider_name, tier, enabled, priority, health_status, health_checked_at').order('tier').order('priority'),
    db.from('provider_health').select('provider, status, last_success, last_failure, failure_count, success_count').order('provider'),
    db.from('agent_capabilities').select('agent_name, capability, action_name, requires_approval, is_active').order('agent_name'),
    db.from('model_registry').select('provider_name, model_id, task_type, cost_in_per_m, cost_out_per_m, is_free, enabled, priority').order('provider_name').order('priority'),
    db.from('inference_log').select('provider, model, tokens_in, tokens_out, cost_usd, success').order('created_at', { ascending: false }).limit(1000),
    db.from('ai_onboarding').select('provider_key, display_name, status, validated_at, approved_at').order('status'),
  ])

  const providers = (provRes.data ?? []) as ProviderRow[]
  const health = (healthRes.data ?? []) as HealthRow[]
  const capabilities = (capRes.data ?? []) as CapabilityRow[]
  const models = (modelRes.data ?? []) as ModelRow[]
  const onboarding = (onbRes.data ?? []) as OnboardingRow[]

  // Aggregate cost from inference_log (mirrors the inference_cost_summary tool, in SQL-free JS)
  type LogRow = {
    provider: string | null; model: string | null
    tokens_in: number | null; tokens_out: number | null
    cost_usd: number | null; success: boolean | null
  }
  const logs = (logRes.data ?? []) as LogRow[]
  const costMap = new Map<string, CostRow>()
  let totalCalls = 0
  let totalCost = 0
  let totalFailures = 0
  for (const l of logs) {
    const provider = l.provider ?? 'unknown'
    const model = l.model ?? 'none'
    const key = `${provider}|${model}`
    const e = costMap.get(key) ?? { provider, model, calls: 0, cost_usd: 0, tokens_in: 0, tokens_out: 0, successes: 0, failures: 0 }
    e.calls += 1
    e.cost_usd += l.cost_usd ?? 0
    e.tokens_in += l.tokens_in ?? 0
    e.tokens_out += l.tokens_out ?? 0
    if (l.success) e.successes += 1
    else e.failures += 1
    costMap.set(key, e)
    totalCalls += 1
    totalCost += l.cost_usd ?? 0
    if (!l.success) totalFailures += 1
  }
  const cost = Array.from(costMap.values()).sort((a, b) => b.calls - a.calls)

  return {
    providers,
    health,
    capabilities,
    models,
    cost,
    costTotals: { calls: totalCalls, cost_usd: totalCost, failures: totalFailures },
    onboarding,
  }
}
