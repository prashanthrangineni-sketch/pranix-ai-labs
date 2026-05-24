'use server'

import { revalidatePath } from 'next/cache'
import { approveGrant } from '@/lib/pranix-mcp'

/**
 * Approve a pending MCP access grant.
 *
 * Form-action signature: receives FormData with a `grant_id` field.
 * On success, revalidates /founder/approvals so the row leaves the
 * "Pending" bucket on the next render.
 *
 * On failure, returns a structured result the form can render inline.
 * (Throws are reserved for unexpected exceptions only; expected tool
 *  failures — bad ID, expired, already approved — surface as ok:false.)
 */
export type ApproveActionState = {
  ok: boolean
  message: string
  grantId?: string
}

export async function approveGrantAction(
  _prev: ApproveActionState | null,
  formData: FormData
): Promise<ApproveActionState> {
  const grantId = formData.get('grant_id')
  if (typeof grantId !== 'string' || !grantId) {
    return { ok: false, message: 'Missing grant_id' }
  }

  // Basic UUID shape check before round-tripping to the MCP endpoint.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(grantId)) {
    return { ok: false, message: 'Invalid grant_id format', grantId }
  }

  const result = await approveGrant({
    grant_id: grantId,
    reason: 'Approved via founder dashboard',
  })

  if (!result.ok) {
    return { ok: false, message: result.error, grantId }
  }

  revalidatePath('/founder/approvals')
  // Also refresh the overview, where pending grant count is shown.
  revalidatePath('/founder')

  return { ok: true, message: 'Grant approved', grantId }
}
