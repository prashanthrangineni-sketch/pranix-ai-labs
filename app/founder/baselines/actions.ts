'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { isBaselineEligible } from '@/lib/baselines'

export async function approveBaselineAction(artifactId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(artifactId)) return { ok: false, error: 'invalid_id' }

  const db = createServerClient()
  const { data: artifact, error: aErr } = await db
    .from('browser_artifacts')
    .select('project_name, check_name, viewport, storage_path')
    .eq('id', artifactId)
    .maybeSingle()
  if (aErr || !artifact) return { ok: false, error: 'artifact_not_found' }
  // claim #4: failure captures, automatic homepage shots and recordings can never become baselines
  if (!isBaselineEligible(artifact.check_name, artifact.storage_path)) return { ok: false, error: 'This picture cannot be approved' }

  // one baseline per check: approving a newer picture replaces the old one
  const { error: bErr } = await db.from('browser_baselines').upsert({
    project_name: artifact.project_name,
    check_name:   artifact.check_name,
    viewport:     artifact.viewport,
    storage_path: artifact.storage_path,
    approved_by:  'founder_dashboard',
    approved_at:  new Date().toISOString(),
  }, { onConflict: 'project_name,check_name,viewport' })
  if (bErr) return { ok: false, error: bErr.message }

  await db.from('browser_artifacts').update({
    status:        'pass',
    diff_score:    0,
    metadata_json: { promoted_to_baseline: true, approved_at: new Date().toISOString() },
  }).eq('id', artifactId)

  revalidatePath('/founder/baselines')
  return { ok: true }
}
