'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Fingerprint, CheckCircle2, Trash2 } from 'lucide-react'

type EnrollState = 'idle' | 'working' | 'done' | 'error'

// enroll({factorType:'webauthn'}) is compile-proven. Ceremony + management
// methods typed defensively so the build never breaks on the exact webauthn
// union; runtime ceremony validated on-device.
type MfaEnrollLike = {
  enroll: (p: { factorType: 'webauthn'; friendlyName?: string }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  challenge: (p: { factorId: string }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  verify: (p: { factorId: string; challengeId: string }) => Promise<{ data: unknown; error: { message: string } | null }>
  listFactors: () => Promise<{
    data: { all?: Array<{ id: string; factor_type?: string; status?: string; friendly_name?: string }> } | null
    error: unknown
  }>
  unenroll: (p: { factorId: string }) => Promise<{ data: unknown; error: { message: string } | null }>
}

export default function BiometricEnrollment() {
  const [factors, setFactors] = useState<Array<{ id: string; friendly_name?: string }>>([])
  const [state, setState] = useState<EnrollState>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const mfa = supabase.auth.mfa as unknown as MfaEnrollLike
      const { data } = await mfa.listFactors()
      const verified = (data?.all ?? []).filter((f) => f.factor_type === 'webauthn' && f.status === 'verified')
      setFactors(verified.map((f) => ({ id: f.id, friendly_name: f.friendly_name })))
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!window.PublicKeyCredential)
    refresh()
  }, [refresh])

  const enroll = useCallback(async () => {
    setState('working'); setErr(null)
    try {
      const supabase = createBrowserClient()
      const mfa = supabase.auth.mfa as unknown as MfaEnrollLike
      const { data: f, error: eErr } = await mfa.enroll({ factorType: 'webauthn', friendlyName: `device-${Date.now()}` })
      if (eErr || !f) { setErr(eErr?.message ?? 'Could not start enrollment.'); setState('error'); return }
      const { data: ch, error: cErr } = await mfa.challenge({ factorId: f.id })
      if (cErr || !ch) { setErr(cErr?.message ?? 'Could not create challenge.'); setState('error'); return }
      const { error: vErr } = await mfa.verify({ factorId: f.id, challengeId: ch.id })
      if (vErr) { setErr(vErr.message ?? 'Verification failed.'); setState('error'); return }
      setState('done'); await refresh()
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setErr('Enrollment failed. Make sure your device has fingerprint or face unlock set up.')
      setState('error')
    }
  }, [refresh])

  const remove = useCallback(async (factorId: string) => {
    setState('working'); setErr(null)
    try {
      const supabase = createBrowserClient()
      const mfa = supabase.auth.mfa as unknown as MfaEnrollLike
      const { error } = await mfa.unenroll({ factorId })
      if (error) { setErr(error.message); setState('error'); return }
      await refresh(); setState('idle')
    } catch {
      setErr('Could not remove. Try again.'); setState('error')
    }
  }, [refresh])

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium text-fg-muted">Biometric Unlock</h2>
      <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
        <p className="text-[11px] text-fg-muted">
          Add your fingerprint or face as a fast unlock. Your password always still works as a fallback. When a
          biometric is registered, opening the dashboard and changing AI controls will ask you to confirm it&apos;s you.
        </p>

        {!supported && (
          <div className="rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-[11px] text-fg-muted">
            This device/browser doesn&apos;t expose a fingerprint/face authenticator. You can still use your password.
          </div>
        )}

        {factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-elevated px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-fg-primary">
                  <Fingerprint className="h-4 w-4 text-accent" /> {f.friendly_name || 'Registered biometric'}
                </span>
                <button onClick={() => remove(f.id)} disabled={state === 'working'}
                  className="flex items-center gap-1 text-[11px] text-severity-error hover:opacity-80 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button onClick={enroll} disabled={state === 'working' || !supported}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            {state === 'working' ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</> : <><Fingerprint className="h-4 w-4" /> Enable biometric unlock</>}
          </button>
        )}

        {err && (
          <div className="rounded-lg border border-severity-error/30 bg-severity-error/10 px-3 py-2 text-xs text-severity-error">{err}</div>
        )}
        {state === 'done' && (
          <div className="flex items-center gap-2 text-xs text-severity-success"><CheckCircle2 className="h-4 w-4" /> Biometric enabled.</div>
        )}
      </div>
    </section>
  )
}
