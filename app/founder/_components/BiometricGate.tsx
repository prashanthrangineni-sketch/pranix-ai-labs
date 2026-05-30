'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Fingerprint, KeyRound, Eye, EyeOff } from 'lucide-react'

// Public founder paths must NEVER be gated (mirror of middleware PUBLIC list) —
// a logged-out founder has to be able to reach login / recovery / break-glass.
const PUBLIC_PATHS = [
  '/founder/login',
  '/founder/auth/callback',
  '/founder/auth/confirm',
  '/founder/auth/reset',
  '/founder/break-glass',
]

type GateState = 'checking' | 'unlocked' | 'locked'

// enroll({factorType:'webauthn'}) is compile-proven against the resolved SDK.
// The ceremony methods (listFactors/challenge/verify) are the standard MFA
// methods; typed defensively here so the build never breaks on the exact
// webauthn param/return union. Runtime ceremony is validated on-device.
type MfaLike = {
  listFactors: () => Promise<{
    data: { all?: Array<{ id: string; factor_type?: string; status?: string }> } | null
    error: unknown
  }>
  challenge: (p: { factorId: string }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  verify: (p: { factorId: string; challengeId: string }) => Promise<{ data: unknown; error: { message: string } | null }>
}

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
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (error || !data) { if (!cancelled) setState('unlocked'); return } // fail-open
        const needsStepUp = data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
        if (!cancelled) setState(needsStepUp ? 'locked' : 'unlocked')
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
      const mfa = supabase.auth.mfa as unknown as MfaLike
      const { data: factors } = await mfa.listFactors()
      const factor =
        factors?.all?.find((f) => f.factor_type === 'webauthn' && f.status === 'verified') ??
        factors?.all?.find((f) => f.status === 'verified')
      if (!factor) { setErr('No biometric registered. Use your password.'); setBusy(false); return }
      const { data: ch, error: chErr } = await mfa.challenge({ factorId: factor.id })
      if (chErr || !ch) { setErr(chErr?.message ?? 'Could not start biometric.'); setBusy(false); return }
      const { error: vErr } = await mfa.verify({ factorId: factor.id, challengeId: ch.id })
      if (vErr) { setErr(vErr.message ?? 'Biometric verification failed.'); setBusy(false); return }
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
