'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { approveGrantAction, type ApproveActionState } from './actions'

/**
 * One-tap approve button for a pending grant.
 *
 * IMPORTANT: this Client Component must NEVER import from '@/lib/pranix-mcp'.
 * It references the server action by reference only; PRANIX_FOUNDER_BEARER
 * is read inside the action on the server.
 */
export function ApproveButton({ grantId }: { grantId: string }) {
  const [state, action] = useFormState<ApproveActionState | null, FormData>(
    approveGrantAction,
    null
  )

  // After success, show a stable "Approved" badge in place of the button.
  if (state?.ok) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-severity-success/30 bg-severity-success/10 px-3 py-1.5 text-xs font-medium text-severity-success">
        <Check className="h-3.5 w-3.5" />
        Approved
      </span>
    )
  }

  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="grant_id" value={grantId} />
      <SubmitButton />
      {state && !state.ok && (
        <span className="inline-flex items-center gap-1 text-[10px] text-severity-error max-w-[200px] text-right">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate" title={state.message}>
            {state.message}
          </span>
        </span>
      )}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Approving
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5" />
          Approve
        </>
      )}
    </button>
  )
}
