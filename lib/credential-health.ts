import { getControlPlane } from '@/lib/control-plane'

export type CredentialHealth = {
  name: string
  provider: string | null
  status: string
  expires_at: string | null
  balance_value: number | null
  alert_threshold: number | null
}

// Credential lifecycle health from the Protocol Core 1.0 credential_health table.
export async function getCredentialHealth(): Promise<CredentialHealth[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('credential_health')
    .select('name, provider, status, expires_at, balance_value, alert_threshold')
    .order('status', { ascending: true })
  return (data ?? []) as CredentialHealth[]
}

export type PromotionGate = {
  project: string
  artifact: string
  implemented: boolean
  tested: boolean
  proven: boolean
  production_ok: boolean
  blocked_reason: string | null
}

// Enforced promotion gates from the Protocol Core 1.0 readiness_gate table
// (distinct from observational outcome_checks).
export async function getPromotionGates(): Promise<PromotionGate[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('readiness_gate')
    .select('project, artifact, implemented, tested, proven, production_ok, blocked_reason')
    .order('updated_at', { ascending: false })
  return (data ?? []) as PromotionGate[]
}
