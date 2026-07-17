'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'

export async function triageIdeaAction(
  ideaId: string,
  status: 'approved' | 'dismissed'
) {
  const gate = await requireWritableFounder()
  if (gate instanceof Response) {
    return { ok: false, message: 'Unauthorized' }
  }

  try {
    const db = createServerClient()
    const { error } = await db
      .from('founder_ideas')
      .update({ status })
      .eq('id', ideaId)

    if (error) throw error

    revalidatePath('/founder')
    revalidatePath('/founder/approvals')
    return { ok: true, message: `Idea ${status}` }
  } catch (err: any) {
    console.error('Failed to triage idea:', err)
    return { ok: false, message: err.message || String(err) }
  }
}
