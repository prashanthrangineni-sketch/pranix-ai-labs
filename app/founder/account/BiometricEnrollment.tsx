'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Fingerprint, CheckCircle2, Trash2 } from 'lucide-react'

// F.2C Phase 1 — biometric unlock via Supabase Passkeys (signInWithPasskey /
// registerPasskey). MFA-WebAuthn is platform-disabled on this project
// ("Enabling of MFA with WebAuthn not currently supported"); passkeys are the
// supported, server-verified WebAuthn surface (passkey_enabled=true).
// Biometric is a DASHBOARD UNLOCK only — it does not gate control writes.

type EnrollState = 'idle' | 'working' | 'done' | 'error'
type Passkey = { id: string; friendly_name?: string }

export default function BiometricEnrollment() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [state, setState] = useState<EnrollState>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.passkey.list()
      setPasskeys((data ?? []).map((p) => ({ id: p.id, friendly_name: p.friendly_name })))
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
      // registerPasskey() runs the full WebAuthn ceremony in the browser and
      // requires the active founder session (it's the account page).
      const { error } = await supabase.auth.registerPasskey()
      if (error) { setErr(error.message || 'Could not register biometric.'); setState('error'); return }
      setState('done'); await refresh()
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setErr('Registration failed. Make sure your device has fingerprint or face unlock set up.')
      setState('error')
    }
  }, [refresh])

  const remove = useCallback(async (passkeyId: string) => {
    setState('working'); setErr(null)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
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
          Add your fingerprint or face as a fast unlock for opening the dashboard. Your password always
          still works as a fallback. This is a convenience lock on app open — it doesn&apos;t change who can
          sign in or what you can do once inside.
        </p>

        {!supported && (
          <div className="rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-[11px] text-fg-muted">
            This device/browser doesn&apos;t expose a fingerprint/face authenticator. You can still use your password.
          </div>
        )}

        {passkeys.length > 0 ? (
          <div className="space-y-2">
            {passkeys.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-elevated px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-fg-primary">
                  <Fingerprint className="h-4 w-4 text-accent" /> {p.friendly_name || 'Registered biometric'}
                </span>
                <button onClick={() => remove(p.id)} disabled={state === 'working'}
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
