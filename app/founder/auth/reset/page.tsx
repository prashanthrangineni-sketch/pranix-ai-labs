'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Shield, Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'

type Phase = 'verifying' | 'ready' | 'no_session' | 'saving' | 'done'

function ResetForm() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mount, establish the recovery session from the link.
  useEffect(() => {
    let active = true
    async function establish() {
      const supabase = createBrowserClient()
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
      } catch {
        // fall through to session check; hash-based flows auto-detect
      }
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setPhase(data.session ? 'ready' : 'no_session')
    }
    establish()
    return () => { active = false }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setPhase('saving')
    try {
      const supabase = createBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setPhase('ready')
        return
      }
      setPhase('done')
      setTimeout(() => router.replace('/founder'), 1500)
    } catch {
      setError('Network error. Check your connection.')
      setPhase('ready')
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
             style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Set Your Password</h1>
        <p className="mt-1 text-sm text-slate-500">Pranix AI Labs — Founder Access</p>
      </div>

      {phase === 'verifying' && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Verifying your link…
        </div>
      )}

      {phase === 'no_session' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
          <p className="text-sm font-medium text-amber-800">This link is invalid or expired.</p>
          <p className="text-xs text-amber-700">
            Password setup links are single-use and time-limited. Request a fresh one.
          </p>
          <button
            onClick={() => router.replace('/founder/login')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Back to login
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-3" />
          <p className="text-sm font-medium text-emerald-800">Password set.</p>
          <p className="mt-2 text-xs text-emerald-600">Signing you in…</p>
        </div>
      )}

      {(phase === 'ready' || phase === 'saving') && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={phase === 'saving' || !password || !confirm}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}
          >
            {phase === 'saving' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><KeyRound className="h-4 w-4" /> Set Password</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default function FounderResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <Suspense fallback={<div className="min-h-screen" />}>
        <ResetForm />
      </Suspense>
    </div>
  )
}
