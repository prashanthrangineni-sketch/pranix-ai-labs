'use client'
// app/founder/approvals/rec-decision-controls.tsx
// P5 — Approve / Dismiss buttons for a Recommendation.
// Calls POST /api/founder/recommendations.
// Only writes to execution_memory key 'p5:rec_status' — no other mutations.

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Props {
  recommendationId: string
}

export function RecDecisionControls({ recommendationId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'approved' | 'dismissed'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function decide(action: 'approved' | 'dismissed') {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/founder/recommendations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: recommendationId, action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Request failed')
        setState('idle')
        return
      }
      setState(action)
    } catch {
      setError('Network error')
      setState('idle')
    }
  }

  if (state === 'approved') {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-severity-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved — recommendation acknowledged
      </div>
    )
  }

  if (state === 'dismissed') {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-fg-disabled">
        <XCircle className="h-3.5 w-3.5" />
        Dismissed
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <button
          onClick={() => decide('approved')}
          disabled={state === 'loading'}
          className="flex items-center gap-1.5 rounded-lg bg-severity-success/10 border border-severity-success/20 px-3 py-1.5 text-[12px] font-medium text-severity-success hover:bg-severity-success/20 disabled:opacity-50 transition-colors"
        >
          {state === 'loading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Approve
        </button>

        <button
          onClick={() => decide('dismissed')}
          disabled={state === 'loading'}
          className="flex items-center gap-1.5 rounded-lg bg-elevated border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-canvas disabled:opacity-50 transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-severity-critical">{error}</p>
      )}

      <p className="text-[10px] text-fg-disabled">
        Approving means you agree this recommendation is valid.
        No code changes or deployments are triggered.
      </p>
    </div>
  )
}
