'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Fingerprint, KeyRound, Eye, EyeOff } from 'lucide-react'

// Public founder paths must NEVER be gated (mirror of middleware PUBLIC list).
const PUBLIC_PATHS = [
  '/founder/login',
  '/founder/auth/callback',
  '/founder/auth/confirm',
  '/founder/auth/reset',
  '/founder/break-glass',
]

type GateState = 'checking' | 'unlocked' | 'locked'

// F.2C Phase 1 — app-open biometric lock backed by Supabase Passkeys.
// If the founder has registered a passkey and hasn't unlocked this app-session,
// the dashboard is hidden until they pass biometric (signInWithPasskey) OR
// password (signInWithPassword fallback). No passkey registered → passthrough
// (additive). Biometric is a DASHBOARD UNLOCK only; it adds no server-side
// authorization (no AMR gating in Phase 1).
export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const [state, setState] = useState<GateState>('checking')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pwMode, setPwMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Decide lock state on app open for private paths.
  useEffect(() => {
    if (isPublic) { setState('unlocked'); return }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) { if (!cancelled) setState('unlocked'); return } // unauth → middleware redirects
        if (!cancelled) setEmail(userData.user.email ?? '')
        const { data, error } = await supabase.auth.passkey.list()
        if (error) { if (!cancelled) setState('unlocked'); return } // fail-open (never harder than today)
        const hasPasskey = (data ?? []).length > 0
        if (!cancelled) setState(hasPasskey ? 'locked' : 'unlocked')
      } catch {
        if (!cancelled) setState('unlocked')
      }
    })()
    return () => { cancelled = true }
  }, [isPublic, pathname])

  const unlockBiometric = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      const supabase = createBrowserClient()
      // Runs the full WebAuthn ceremony and establishes a fresh session
      // (persisted via the F.2B cookie options on this client).
      const { data, error } = await supabase.auth.signInWithPasskey()
      if (error || !data.session) {
        setErr(error?.message ?? 'Biometric unlock failed. Use your password.')
        setBusy(false); return
      }
      setState('unlocked')
    } catch {
      setErr('Biometric unlock failed. Use your password.')
    } finally {
      setBusy(false)
    }
  }, [])

  const unlockPassword = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErr(error.message); setBusy(false); return }
      setPassword('')
      setState('unlocked')
    } catch {
      setErr('Could not verify password.')
    } finally {
      setBusy(false)
    }
  }, [email, password])

  if (isPublic || state === 'unlocked') return <>{children}</>

  if (state === 'checking') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
      </div>
    )
  }

  // locked
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 backdrop-blur px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-6 space-y-5 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-accent-subtle p-3"><Fingerprint className="h-7 w-7 text-accent" /></div>
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-semibold text-fg-primary">Unlock Pranix</h1>
          <p className="text-xs text-fg-muted">Confirm it&apos;s you to open the founder dashboard.</p>
        </div>

        {err && (
          <div className="rounded-lg border border-severity-error/30 bg-severity-error/10 px-3 py-2 text-xs text-severity-error">{err}</div>
        )}

        {!pwMode ? (
          <div className="space-y-3">
            <button onClick={unlockBiometric} disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              Unlock with biometrics
            </button>
            <button onClick={() => { setErr(null); setPwMode(true) }} disabled={busy}
              className="w-full text-xs text-fg-muted hover:text-fg-primary underline underline-offset-2">
              Use password instead
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="username"
              className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password"
                className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 pr-10 text-sm text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-disabled hover:text-fg-muted">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={unlockPassword} disabled={busy || !email || !password}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Unlock with password
            </button>
            <button onClick={() => { setErr(null); setPwMode(false) }} disabled={busy}
              className="w-full text-xs text-fg-muted hover:text-fg-primary underline underline-offset-2">
              Back to biometrics
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
