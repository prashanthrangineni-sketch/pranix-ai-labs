import { getControlPlane } from '@/app/lib/control-plane'

// Operational hub data layer (read-only). Reuses existing control-plane tables to
// back the consolidated /founder/more views: Protocols, Observability, Deployments, Settings.

export type Protocol = { name: string; version: string | null; status: string | null; description: string | null }
export type DeployDiag = {
  project_name: string | null; branch: string | null; error_type: string | null
  error_summary: string | null; resolved: boolean | null; created_at: string
}
export type ApkRelease = {
  product_name: string | null; package_name: string | null; version_name: string | null
  readiness_score: number | null; play_store_status: string | null
}
export type SystemMode = { mode_name: string; active: boolean | null; description: string | null }
export type Snapshot = {
  snapshot_at: string; system_status: string | null
  tasks_pending: number | null; tasks_running: number | null; tasks_dead_1h: number | null
  queue_pressure: number | null; inference_calls_1h: number | null; inference_fails_1h: number | null
  critical_alerts_1h: number | null
}

export type Operations = {
  protocols: Protocol[]
  latestSnapshot: Snapshot | null
  deployments: DeployDiag[]
  apks: ApkRelease[]
  modes: SystemMode[]
  founders: string[]
  breakGlassConfigured: boolean
}

export async function getOperations(): Promise<Operations> {
  const db = getControlPlane()
  const [protoRes, snapRes, deployRes, apkRes, modeRes, founderRes, bgRes] = await Promise.all([
    db.from('protocol_registry').select('name, version, status, description').order('name'),
    db.from('system_snapshots').select('snapshot_at, system_status, tasks_pending, tasks_running, tasks_dead_1h, queue_pressure, inference_calls_1h, inference_fails_1h, critical_alerts_1h').order('snapshot_at', { ascending: false }).limit(1),
    db.from('deployment_diagnostics').select('project_name, branch, error_type, error_summary, resolved, created_at').order('created_at', { ascending: false }).limit(10),
    db.from('apk_releases').select('product_name, package_name, version_name, readiness_score, play_store_status').order('created_at', { ascending: false }),
    db.from('system_modes').select('mode_name, active, description').order('mode_name'),
    db.from('dashboard_founders').select('email').order('email'),
    db.from('founder_break_glass').select('email').limit(1),
  ])

  const founders = ((founderRes.data ?? []) as Array<{ email: string }>).map((f) => f.email)
  const snaps = (snapRes.data ?? []) as Snapshot[]

  return {
    protocols: (protoRes.data ?? []) as Protocol[],
    latestSnapshot: snaps.length > 0 ? snaps[0] : null,
    deployments: (deployRes.data ?? []) as DeployDiag[],
    apks: (apkRes.data ?? []) as ApkRelease[],
    modes: (modeRes.data ?? []) as SystemMode[],
    founders,
    breakGlassConfigured: ((bgRes.data ?? []) as unknown[]).length > 0,
  }
}
