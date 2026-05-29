'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Check, Loader2, AlertCircle, Clock, CalendarClock, Infinity as InfinityIcon, X, Ban } from 'lucide-react'
import { decideGrantAction, type DecisionState, type DecisionKind } from './actions'

/**
 * Founder decision controls for one permission request.
 *
 * mode="pending" -> Allow once / This session / Always / Deny
 * mode="active"  -> Revoke
 *
 * Mobile-first, plain language. Server action enforces the founder gate.
 */
export function DecisionControls({
  grantId,
  mode,
}: {
  grantId: string
  mode: 'pending' | 'active'
}) {
  const [state, action] = useFormState<DecisionState | null, FormData>(
    decideGrantAction,
    null
  )

  if (state?.ok) {
    const denied = state.action === 'deny' || state.action === 'revoke'
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium ${
          denied
            ? 'border border-severity-critical/30 bg-severity-critical/10 text-severity-critical'
            : 'border border-severity-success/30 bg-severity-success/10 text-severity-success'
        }`}
      >
        {denied ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        {state.message}
      </div>
    )
  }

  return (
    <form action={action} className="w-full">
      <input type="hidden" name="grant_id" value={grantId} />

      {mode === 'pending' ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Btn action="allow_once" tone="allow" icon={<Clock className="h-4 w-4" />} label="Allow once" sub="15 min" />
          <Btn action="allow_session" tone="allow" icon={<CalendarClock className="h-4 w-4" />} label="This session" sub="8 hrs" />
          <Btn action="allow_permanent" tone="allow" icon={<InfinityIcon className="h-4 w-4" />} label="Always" sub="permanent" />
          <Btn action="deny" tone="deny" icon={<X className="h-4 w-4" />} label="Deny" sub="block" />
        </div>
      ) : (
        <div className="flex justify-end">
          <Btn action="revoke" tone="deny" icon={<Ban className="h-4 w-4" />} label="Revoke access" sub="" wide />
        </div>
      )}

      {state && !state.ok && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-severity-critical">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  )
}

function Btn({
  action,
  tone,
  icon,
  label,
  sub,
  wide,
}: {
  action: DecisionKind
  tone: 'allow' | 'deny'
  icon: React.ReactNode
  label: string
  sub: string
  wide?: boolean
}) {
  const { pending } = useFormStatus()
  const toneClass =
    tone === 'allow'
      ? 'border-border-subtle bg-surface text-fg-primary hover:border-severity-success/50 hover:bg-severity-success/5'
      : 'border-severity-critical/30 bg-severity-critical/5 text-severity-critical hover:bg-severity-critical/10'

  return (
    <button
      type="submit"
      name="action"
      value={action}
      disabled={pending}
      className={`flex ${wide ? 'min-w-[160px]' : 'w-full'} flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${toneClass}`}
    >
      <span className="flex items-center gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </span>
      {sub ? <span className="text-[10px] font-normal opacity-70">{sub}</span> : null}
    </button>
  )
}
