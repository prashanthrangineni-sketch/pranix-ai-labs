'use client'
/**
 * ModeSwitcher — client component
 * Activates a Founder Mode by POSTing to /api/founder/modes.
 * Used inside the server-rendered settings/page.tsx.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  modeId:   string
  isActive: boolean
  colorCls: string
}

export function ModeSwitcher({ modeId, isActive, colorCls }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  async function activate() {
    if (isActive) return
    setErr(null)
    try {
      const res = await fetch('/api/founder/modes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'set_mode', mode_id: modeId }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Failed to set mode')
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setErr('Network error')
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={activate}
        disabled={isActive || isPending}
        className={`w-full rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all ${
          isActive
            ? `border-current ${colorCls} bg-transparent cursor-default opacity-80`
            : 'border-border-subtle text-fg-muted hover:border-accent hover:text-accent'
        }`}
        aria-label={isActive ? `${modeId} is active` : `Activate ${modeId}`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Activating…
          </span>
        ) : isActive ? (
          'Active Mode'
        ) : (
          'Activate'
        )}
      </button>
      {err && <p className="text-[11px] text-severity-critical">{err}</p>}
    </div>
  )
}
