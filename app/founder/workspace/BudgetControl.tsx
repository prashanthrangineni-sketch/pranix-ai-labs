'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Loader2, PauseCircle, Pencil } from 'lucide-react'

// Budget control. Pause + reduce apply immediately (risk-reducing).
// Increasing the budget requires an explicit confirm (spend-increasing).
export default function BudgetControl({ current }: { current: number | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(current != null ? String(current) : '')
  const [confirmIncrease, setConfirmIncrease] = useState<number | null>(null)

  async function post(action: 'set' | 'clear', budget_usd?: number) {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/founder/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, budget_usd }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setErr(json?.error || res.statusText)
      else {
        setEditing(false)
        setConfirmIncrease(null)
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setBusy(false)
    }
  }

  function onSave() {
    const n = Number(val)
    if (!Number.isFinite(n) || n < 0) {
      setErr('Enter a valid amount')
      return
    }
    const isIncrease = (current == null && n > 0) || (current != null && n > current)
    if (isIncrease) {
      setConfirmIncrease(n)
      return
    }
    post('set', n)
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-canvas p-4">
      {err && (
        <div className="mb-2 rounded-md border border-severity-error/30 bg-severity-error/10 px-3 py-2 text-[11px] text-severity-error">
          {err}
        </div>
      )}
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-fg-muted" />
        <span className="text-[11px] text-fg-muted">Daily paid budget</span>
      </div>
      <p className="text-2xl font-bold text-fg-primary tabular-nums mt-1">
        {current == null ? 'Default' : current === 0 ? 'Paused ($0)' : `$${current}`}
      </p>
      <p className="text-[11px] text-fg-disabled mb-3">
        {current == null
          ? 'No founder cap set — engine default applies.'
          : current === 0
            ? 'Paid providers paused. Free + local still run.'
            : 'Caps paid (Anthropic / NVIDIA) spend per day.'}
      </p>

      {confirmIncrease != null ? (
        <div className="rounded-md border border-severity-warn/40 bg-severity-warn/10 p-3">
          <p className="text-[12px] text-fg-primary mb-2">
            Increase budget to ${confirmIncrease}? This raises paid-spend exposure.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('set', confirmIncrease)}
              className="flex items-center gap-1.5 rounded-md bg-severity-warn/20 px-3 py-1.5 text-[12px] font-medium text-severity-warn disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Confirm increase
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmIncrease(null)}
              className="rounded-md bg-elevated px-3 py-1.5 text-[12px] text-fg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="USD / day"
            className="w-24 rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-[13px] text-fg-primary"
          />
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="rounded-md bg-accent-subtle px-3 py-1.5 text-[12px] font-medium text-accent disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(false)}
            className="rounded-md bg-elevated px-3 py-1.5 text-[12px] text-fg-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || current === 0}
            onClick={() => post('set', 0)}
            className="flex items-center gap-1.5 rounded-md bg-severity-error/10 px-3 py-1.5 text-[12px] font-medium text-severity-error disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
            Pause Paid Usage
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setVal(current != null ? String(current) : '')
              setEditing(true)
            }}
            className="flex items-center gap-1.5 rounded-md bg-elevated px-3 py-1.5 text-[12px] font-medium text-fg-secondary disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Change Budget
          </button>
        </div>
      )}
    </div>
  )
}
