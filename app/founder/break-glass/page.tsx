'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Loader2, Eye, EyeOff, KeyRound, CheckCircle2, LifeBuoy } from 'lucide-react'

type Phase = 'form' | 'saving' | 'done'

export default function FounderBreakGlassPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setPhase('saving')
    try {
      const res = await fetch('/api/founder/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secret, new_password: password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json?.error || 'Reset failed.'); setPhase('form'); return }
      setPhase('done')
      setTimeout(() => router.replace('/founder/login'), 1800)
    } catch {
      setError('Network error. Check your connection.')
      setPhase('form')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
               style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
            <LifeBuoy className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Break-glass Recovery</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set a new password using your recovery secret — no email needed.
          </p>
        </div>

        {phase === 'done' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-emerald-800">Password set.</p>
            <p className="mt-2 text-xs text-emerald-600">Taking you to the login page…</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="bg-email" className="block text-sm font-medium text-slate-700 mb-1">Founder email</label>
              <input
                id="bg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@pranixailabs.com" required autoComplete="email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="bg-secret" className="block text-sm font-medium text-slate-700 mb-1">Recovery secret</label>
              <input
                id="bg-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
                placeholder="The secret you set on the Account page" required autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="bg-pw" className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <div className="relative">
                <input
                  id="bg-pw" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters" required autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <input
              type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password" required autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <button
              type="submit" disabled={phase === 'saving' || !email || !secret || !password || !confirm}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}
            >
              {phase === 'saving' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Setting password…</>)
                : (<><KeyRound className="h-4 w-4" /> Set Password</>)}
            </button>

            <button type="button" onClick={() => router.replace('/founder/login')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700">
              Back to login
            </button>

            <p className="flex items-start gap-1.5 text-[11px] text-slate-400 pt-1">
              <Shield className="h-3.5 w-3.5 shrink-0 mt-px" />
              Requires the recovery secret you set on your Account page while signed in. Five wrong
              attempts locks recovery for 15 minutes.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
