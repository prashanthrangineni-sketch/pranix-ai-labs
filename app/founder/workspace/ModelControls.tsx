'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Power, Loader2 } from 'lucide-react'

type ModelRow = {
  provider_name: string
  model_id: string
  is_free: boolean | null
  enabled: boolean | null
}

// Model control. Disable applies immediately. Enable requires a confirm tap
// (spend/exposure-increasing). Toggling a model flips all its task rows.
export default function ModelControls({ models }: { models: ModelRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  // Dedupe by provider::model_id; a model counts as enabled if any task row is enabled.
  const map = new Map<string, { provider_name: string; model_id: string; is_free: boolean; enabled: boolean }>()
  for (const m of models) {
    const k = `${m.provider_name}::${m.model_id}`
    const e = map.get(k)
    if (e) e.enabled = e.enabled || m.enabled === true
    else map.set(k, { provider_name: m.provider_name, model_id: m.model_id, is_free: m.is_free === true, enabled: m.enabled === true })
  }
  const rows = Array.from(map.values()).sort(
    (a, b) => a.provider_name.localeCompare(b.provider_name) || a.model_id.localeCompare(b.model_id)
  )

  async function post(provider_name: string, model_id: string, action: 'enable' | 'disable') {
    const k = `${provider_name}::${model_id}`
    setBusy(k)
    setErr(null)
    try {
      const res = await fetch('/api/founder/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name, model_id, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setErr(`${model_id}: ${json?.error || res.statusText}`)
      else {
        setConfirmKey(null)
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      {err && (
        <div className="rounded-md border border-severity-error/30 bg-severity-error/10 px-3 py-2 text-[11px] text-severity-error">
          {err}
        </div>
      )}
      {rows.map((m) => {
        const k = `${m.provider_name}::${m.model_id}`
        const isBusy = busy === k
        const confirming = confirmKey === k
        return (
          <div key={k} className="rounded-lg border border-border-subtle bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] text-fg-primary truncate">
                  <span className="text-fg-muted">{m.provider_name}</span> ·{' '}
                  <span className="font-mono text-[11px]">{m.model_id}</span>
                </p>
                <p className="text-[10px] text-fg-disabled">
                  {m.is_free ? 'free' : 'paid'} · {m.enabled ? 'enabled' : 'disabled'}
                </p>
              </div>
              {confirming ? (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => post(m.provider_name, m.model_id, 'enable')}
                    className="rounded-md bg-severity-warn/20 px-2.5 py-1 text-[11px] font-medium text-severity-warn disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm enable'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmKey(null)}
                    className="rounded-md bg-elevated px-2 py-1 text-[11px] text-fg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => (m.enabled ? post(m.provider_name, m.model_id, 'disable') : setConfirmKey(k))}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium shrink-0 disabled:opacity-50 ${
                    m.enabled
                      ? 'bg-severity-error/10 text-severity-error hover:bg-severity-error/20'
                      : 'bg-severity-success/10 text-severity-success hover:bg-severity-success/20'
                  }`}
                >
                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                  {m.enabled ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
