'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Circle, Power, Loader2 } from 'lucide-react'

type ProviderRow = {
  provider_name: string
  enabled: boolean | null
  tier: number | null
  priority: number | null
  health_status: string | null
  health_checked_at: string | null
}
type ProviderStat = { ok: number; fail: number; last?: string }

function healthVisual(enabled: boolean | null, health: string | null) {
  if (!enabled) return { dot: 'bg-fg-disabled', Icon: Circle, icon: 'text-fg-disabled', label: 'Disabled' }
  const h = (health || '').toLowerCase()
  if (h === 'ok' || h === 'healthy')
    return { dot: 'bg-severity-success', Icon: CheckCircle2, icon: 'text-severity-success', label: 'Healthy' }
  if (h.includes('offline') || h.includes('down'))
    return { dot: 'bg-severity-error', Icon: AlertTriangle, icon: 'text-severity-error', label: 'Offline' }
  return { dot: 'bg-severity-warn', Icon: AlertTriangle, icon: 'text-severity-warn', label: health || 'Unknown' }
}

export default function ProviderControls({
  providers,
  stats,
}: {
  providers: ProviderRow[]
  stats: Record<string, ProviderStat>
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmEnable, setConfirmEnable] = useState<string | null>(null)

  async function call(provider_name: string, action: 'enable' | 'disable' | 'set_priority', priority?: number) {
    setBusy(provider_name)
    setErr(null)
    try {
      const res = await fetch('/api/founder/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name, action, priority }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`${provider_name}: ${json?.error || res.statusText}`)
      } else {
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

      {providers.map((p) => {
        const v = healthVisual(p.enabled, p.health_status)
        const stat = stats[p.provider_name]
        const isBusy = busy === p.provider_name
        const pr = p.priority ?? 0
        return (
          <div key={p.provider_name} className="rounded-lg border border-border-subtle bg-surface p-3">
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${v.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-fg-primary truncate">{p.provider_name}</span>
                  <v.Icon className={`h-3.5 w-3.5 shrink-0 ${v.icon}`} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-muted mt-0.5">
                  <span className={p.enabled ? 'text-severity-success' : 'text-fg-disabled'}>
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span>{v.label}</span>
                  <span data-numeric>priority {pr}</span>
                  {stat && (stat.ok > 0 || stat.fail > 0) && (
                    <span data-numeric>
                      {stat.ok} ok / {stat.fail} fail
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Real controls — write provider_registry via /api/founder/providers */}
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border-subtle">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => call(p.provider_name, p.enabled ? 'disable' : 'enable')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                  p.enabled
                    ? 'bg-severity-error/10 text-severity-error hover:bg-severity-error/20'
                    : 'bg-severity-success/10 text-severity-success hover:bg-severity-success/20'
                }`}
              >
                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                {p.enabled ? 'Disable' : 'Enable'}
              </button>

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-fg-disabled">priority</span>
                <button
                  type="button"
                  disabled={isBusy || pr <= 0}
                  onClick={() => call(p.provider_name, 'set_priority', Math.max(0, pr - 1))}
                  className="rounded px-1.5 py-0.5 text-[12px] leading-none bg-elevated text-fg-secondary hover:text-fg-primary disabled:opacity-40"
                  aria-label="Raise precedence (lower number runs first)"
                >
                  −
                </button>
                <span className="text-[11px] font-mono text-fg-primary w-5 text-center" data-numeric>
                  {pr}
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => call(p.provider_name, 'set_priority', pr + 1)}
                  className="rounded px-1.5 py-0.5 text-[12px] leading-none bg-elevated text-fg-secondary hover:text-fg-primary disabled:opacity-40"
                  aria-label="Lower precedence"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
