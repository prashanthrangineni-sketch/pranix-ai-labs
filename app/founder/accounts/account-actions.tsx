'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { RefreshCw, KeyRound, Unplug, Loader2, Check, AlertCircle } from 'lucide-react'
import { requestAccountAction, type AccountActionState, type AccountActionKind } from './actions'

/**
 * Sensitive account controls. Every action is routed to the Permission Center
 * for approval (the server action never executes directly).
 */
export function AccountActions({
  integrationId,
  integrationName,
}: {
  integrationId: string
  integrationName: string
  monitored?: boolean
}) {
  const [state, action] = useFormState<AccountActionState | null, FormData>(
    requestAccountAction,
    null
  )

  if (state?.ok) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-severity-warn/30 bg-severity-warn/10 px-2.5 py-1.5 text-[12px] font-medium text-severity-warn">
        <Check className="h-3.5 w-3.5" /> {state.message}
      </div>
    )
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="integration_id" value={integrationId} />
      <input type="hidden" name="integration_name" value={integrationName} />
      <div className="flex flex-wrap gap-2">
        <ActBtn action="reauthorize" icon={<RefreshCw className="h-3.5 w-3.5" />} label="Reauthorize" />
        <ActBtn action="rotate" icon={<KeyRound className="h-3.5 w-3.5" />} label="Rotate key" />
        <ActBtn action="disconnect" icon={<Unplug className="h-3.5 w-3.5" />} label="Disconnect" danger />
      </div>
      {state && !state.ok && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-severity-critical">
          <AlertCircle className="h-3 w-3 shrink-0" /> {state.message}
        </p>
      )}
      <p className="mt-2 text-[10px] text-fg-disabled">
        Actions need your approval in Permissions before anything changes.
      </p>
    </form>
  )
}

function ActBtn({
  action,
  icon,
  label,
  danger,
}: {
  action: AccountActionKind
  icon: React.ReactNode
  label: string
  danger?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="action"
      value={action}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${
        danger
          ? 'border-severity-critical/30 bg-severity-critical/5 text-severity-critical hover:bg-severity-critical/10'
          : 'border-border-subtle bg-surface text-fg-secondary hover:bg-elevated hover:text-fg-primary'
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
