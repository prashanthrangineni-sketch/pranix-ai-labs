// lib/execution-memory.ts
// Shared, in-process access to the control-plane `execution_memory` table.
//
// Used DIRECTLY (no HTTP round-trip) by app/api/founder/modes/route.ts (P9) and
// app/api/founder/execution/route.ts (P11) — this replaces the internal
// fetch('/api/founder/execution-memory') calls those two routes used to make,
// which meant that endpoint had to stay reachable (and therefore un-authed)
// purely so same-server code could call itself over HTTP.
//
// app/api/founder/execution-memory/route.ts still exists for any legitimate
// external/browser caller, but is now gated by assertFounder() like every
// other founder/* route, since nothing internal needs it unauthenticated
// anymore.

import { getControlPlane } from './control-plane'

export const DEFAULT_EXECUTION_MEMORY_PROJECT = 'pranix'
export const DEFAULT_EXECUTION_MEMORY_TTL_HOURS = 24

function expiresAt(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

export async function readExecutionMemory(project: string, key: string): Promise<unknown> {
  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('execution_memory')
      .select('value, expires_at')
      .eq('project', project)
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error) return null
    return data?.value ?? null
  } catch {
    return null
  }
}

export async function writeExecutionMemory(
  project: string,
  key: string,
  value: unknown,
  ttlHours: number = DEFAULT_EXECUTION_MEMORY_TTL_HOURS,
): Promise<boolean> {
  try {
    const db = getControlPlane()
    const { error } = await db.from('execution_memory').upsert(
      {
        key,
        project,
        value,
        expires_at: expiresAt(ttlHours),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'key,project' },
    )
    return !error
  } catch {
    return false
  }
}
