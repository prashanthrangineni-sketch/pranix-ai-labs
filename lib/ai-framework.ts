import { getControlPlane } from '@/app/lib/control-plane'

// ─── Types ───────────────────────────────────────────────────────

export type Check = { label: string; ok: boolean; detail: string }

export type ProviderOnboarding = {
  provider_key: string
  display_name: string
  status: string // draft | validated | approved | active | suspended
  auth_type: string | null
  // manifest requirements
  capabilities_provided: string[]
  modalities: string[]
  scopes_required: string[] | null
  account_access_required: string[]
  mcp_tools_supported: string[]
  external_integrations: string[]
  webhooks_required: string[]
  callbacks_required: string[]
  governance_controls: string[]
  mandatory_founder_approvals: string[]
  audit_controls: string[]
  fallback_behavior: string | null
  failure_modes: string[]
  monitoring: string[]
  observability: string[]
  // live registry facts (joined, real)
  live_enabled: boolean | null
  health_status: string | null
  api_key_env: string | null
  tier: number | null
  model_count: number
  free_model_count: number
  cost_in_min: number | null
  cost_in_max: number | null
  access_scopes: string[] // from mcp_access_registry
  // computed
  checks: Check[]
  validation_passes: boolean
}

export type AiFramework = {
  providers: ProviderOnboarding[]
  activeCount: number
  draftCount: number
  validatedReadyCount: number // passes validation but not yet active
}

// ─── Reader: reconcile manifest against all existing registries ──

export async function getAiFramework(): Promise<AiFramework> {
  const db = getControlPlane()

  const [manifestRes, provRes, modelRes, accessRes] = await Promise.all([
    db.from('ai_onboarding').select('*'),
    db.from('provider_registry').select('provider_name, enabled, api_key_env, health_status, tier'),
    db.from('model_registry').select('provider_name, cost_in_per_m, is_free'),
    db.from('mcp_access_registry').select('service, scope'),
  ])

  const provBy = new Map<string, any>()
  for (const p of provRes.data ?? []) provBy.set(p.provider_name, p)

  const modelsBy = new Map<string, { count: number; free: number; costs: number[] }>()
  for (const m of modelRes.data ?? []) {
    const e = modelsBy.get(m.provider_name) ?? { count: 0, free: 0, costs: [] }
    e.count++
    if (m.is_free) e.free++
    if (typeof m.cost_in_per_m === 'number') e.costs.push(m.cost_in_per_m)
    modelsBy.set(m.provider_name, e)
  }

  const accessBy = new Map<string, string[]>()
  for (const a of accessRes.data ?? []) {
    const arr = accessBy.get(a.service) ?? []
    if (a.scope) arr.push(a.scope)
    accessBy.set(a.service, arr)
  }

  const providers: ProviderOnboarding[] = (manifestRes.data ?? []).map((o: any) => {
    const pr = provBy.get(o.provider_key)
    const mdl = modelsBy.get(o.provider_key) ?? { count: 0, free: 0, costs: [] }
    const costs = mdl.costs.filter((c) => c > 0)
    const access = accessBy.get(o.provider_key) ?? []

    const keyConfigured = !!pr?.api_key_env
    const hasModels = mdl.count > 0
    const capsDeclared = (o.capabilities_provided?.length ?? 0) > 0
    const scopesDeclared = o.scopes_required != null
    const governanceSet = (o.mandatory_founder_approvals?.length ?? 0) > 0
    const fallbackSet = !!o.fallback_behavior

    const checks: Check[] = [
      { label: 'API key configured', ok: keyConfigured, detail: pr?.api_key_env ? `env ${pr.api_key_env}` : 'no key registered' },
      { label: 'Models registered', ok: hasModels, detail: hasModels ? `${mdl.count} model${mdl.count === 1 ? '' : 's'}` : 'none in model registry' },
      { label: 'Capabilities declared', ok: capsDeclared, detail: capsDeclared ? o.capabilities_provided.join(', ') : 'not declared' },
      { label: 'Scopes declared', ok: scopesDeclared, detail: scopesDeclared ? (o.scopes_required.join(', ') || 'none required') : 'not declared' },
      { label: 'Governance / approvals set', ok: governanceSet, detail: governanceSet ? o.mandatory_founder_approvals.join(', ') : 'no mandatory approvals set' },
      { label: 'Fallback behavior defined', ok: fallbackSet, detail: o.fallback_behavior || 'not defined' },
    ]
    const validation_passes = checks.every((c) => c.ok)

    return {
      provider_key: o.provider_key,
      display_name: o.display_name,
      status: o.status,
      auth_type: o.auth_type ?? null,
      capabilities_provided: o.capabilities_provided ?? [],
      modalities: o.modalities ?? [],
      scopes_required: o.scopes_required ?? null,
      account_access_required: o.account_access_required ?? [],
      mcp_tools_supported: o.mcp_tools_supported ?? [],
      external_integrations: o.external_integrations ?? [],
      webhooks_required: o.webhooks_required ?? [],
      callbacks_required: o.callbacks_required ?? [],
      governance_controls: o.governance_controls ?? [],
      mandatory_founder_approvals: o.mandatory_founder_approvals ?? [],
      audit_controls: o.audit_controls ?? [],
      fallback_behavior: o.fallback_behavior ?? null,
      failure_modes: o.failure_modes ?? [],
      monitoring: o.monitoring ?? [],
      observability: o.observability ?? [],
      live_enabled: pr ? !!pr.enabled : null,
      health_status: pr?.health_status ?? null,
      api_key_env: pr?.api_key_env ?? null,
      tier: pr?.tier ?? null,
      model_count: mdl.count,
      free_model_count: mdl.free,
      cost_in_min: costs.length ? Math.min(...costs) : null,
      cost_in_max: costs.length ? Math.max(...costs) : null,
      access_scopes: access,
      checks,
      validation_passes,
    }
  })

  // Order: active first, then validation-ready drafts, then the rest.
  providers.sort((a, b) => {
    const rank = (p: ProviderOnboarding) => (p.status === 'active' ? 0 : p.validation_passes ? 1 : 2)
    return rank(a) - rank(b) || a.display_name.localeCompare(b.display_name)
  })

  return {
    providers,
    activeCount: providers.filter((p) => p.status === 'active').length,
    draftCount: providers.filter((p) => p.status !== 'active').length,
    validatedReadyCount: providers.filter((p) => p.status !== 'active' && p.validation_passes).length,
  }
}

/** Server-side re-validation used to gate activation (never trust the client). */
export async function validateProvider(providerKey: string): Promise<{ ok: boolean; missing: string[] }> {
  const fw = await getAiFramework()
  const p = fw.providers.find((x) => x.provider_key === providerKey)
  if (!p) return { ok: false, missing: ['Provider not found'] }
  const missing = p.checks.filter((c) => !c.ok).map((c) => c.label)
  return { ok: missing.length === 0, missing }
}
