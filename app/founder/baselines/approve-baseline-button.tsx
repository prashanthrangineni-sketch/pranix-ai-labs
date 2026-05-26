'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { approveBaselineAction } from './actions'

export function ApproveBaselineButton({ artifactId }: { artifactId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-severity-success">
        <Check className="h-3 w-3" /> approved as baseline
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await approveBaselineAction(artifactId)
            if (r.ok) setDone(true)
            else setError(r.error || 'failed')
          })
        }
        className="rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-[11px] font-medium hover:bg-canvas active:scale-95 transition disabled:opacity-50"
      >
        {isPending ? 'Approving…' : 'Approve as baseline'}
      </button>
      {error && <span className="text-[10px] text-severity-warn">{error}</span>}
    </div>
  )
}
