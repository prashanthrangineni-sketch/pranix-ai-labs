'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Check, AlertCircle, ShieldAlert } from 'lucide-react'
import { requestProviderActivation, type ActivationState } from './actions'

export function ActivationButton({
  providerKey,
  displayName,
  canActivate,
}: {
  providerKey: string
  displayName: string
  canActivate: boolean
}) {
  const [state, action] = useFormState<ActivationState | null, FormData>(
    requestProviderActivation,
    null
  )

  if (state?.ok) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-severity-warn/30 bg-severity-warn/10 px-2.5 py-1.5 text-[12px] font-medium text-severity-warn">
        <ShieldAlert className="h-3.5 w-3.5" /> {state.message}
      </div>
    )
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="provider_key" value={providerKey} />
      <input type="hidden" name="display_name" value={displayName} />
      <SubmitButton canActivate={canActivate} />
      {state && !state.ok && (
        <div className="mt-2 text-[11px] text-severity-critical">
          <p className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" /> {state.message}</p>
          {state.missing && state.missing.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {state.missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}

function SubmitButton({ canActivate }: { canActivate: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || !canActivate}
      title={canActivate ? 'Send activation for approval' : 'Validation must pass first'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent px-3 py-1.5 text-[12px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      {canActivate ? 'Request activation' : 'Validation required'}
    </button>
  )
}
