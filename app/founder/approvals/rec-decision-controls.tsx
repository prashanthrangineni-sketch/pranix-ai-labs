'use client'
// app/founder/approvals/rec-decision-controls.tsx
// P5+P6 — Approve / Dismiss buttons for a Recommendation.
// On Approve:
//   1. PATCH /api/founder/recommendations  — mark rec as approved
//   2. POST  /api/founder/operations        — create Operation work-item
// On Dismiss:
//   1. PATCH /api/founder/recommendations  — mark rec as dismissed (no op created)
//
// Storage: execution_memory only. No GitHub / Vercel / Supabase row writes.

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ListChecks } from 'lucide-react'

interface Props {
  recommendationId: string
  recTitle?:        string
  recCategory?:     string
  recRiskLevel?:    string
  recSummary?:      string
  sourceTaskId?:    string | null
}

export function RecDecisionControls({
  recommendationId,
  recTitle     = '',
  recCategory  = 'workflow',
  recRiskLevel = 'medium',
  recSummary   = '',
  sourceTaskId = null,
}: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'approved' | 'dismissed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [opTitle, setOpTitle]   = useState<string | null>(null)
  const [opId,    setOpId]      = useState<string | null>(null)

  async function decide(action: 'approved' | 'dismissed') {
    setState('loading')
    setError(null)
    try {
      // Step 1: persist rec status
      const recRes = await fetch('/api/founder/recommendations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: recommendationId, action }),
      })
      if (!recRes.ok) {
        const j = await recRes.json().catch(() => ({}))
        setError(j.error ?? 'Request failed')
        setState('idle')
        return
      }

      // Step 2: if approved, create operation
      if (action === 'approved') {
        const opRes = await fetch('/api/founder/operations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            action:            'create',
            recommendation_id: recommendationId,
            title:             recTitle,
            category:          recCategory,
            risk_level:        recRiskLevel,
            summary:           recSummary,
            source_task_id:    sourceTaskId,
          }),
        })
        if (opRes.ok) {
          const j = await opRes.json()
          setOpTitle(j.operation?.title ?? null)
          setOpId(j.operation_id ?? null)
        }
        // Non-fatal if op creation fails — rec is still approved
      }

      setState(action)
    } catch {
      setError('Network error')
      setState('idle')
    }
  }

  if (state === 'approved') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[12px] text-severity-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Recommendation approved
        </div>
        {opTitle && (
          <div className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/[0.04] px-3 py-2">
            <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-fg-primary">Operation created successfully</p>
              <p className="text-[11px] text-fg-muted truncate">{opTitle}</p>
              {opId && (
                <p className="text-[10px] text-fg-disabled font-mono mt-0.5">{opId}</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (state === 'dismissed') {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-fg-disabled">
        <XCircle className="h-3.5 w-3.5" />
        Dismissed — no operation created
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
          {state === 'loading'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CheckCircle2 className="h-3.5 w-3.5" />}
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
        Approve → marks recommendation valid and creates an operation.
        Dismiss → no operation is created.
        No code changes or deployments are triggered.
      </p>
    </div>
  )
}
