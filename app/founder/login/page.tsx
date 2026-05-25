'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Shield, ArrowRight, Loader2 } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(errorParam)

  useEffect(() => {
    if (email.length > 0 && error) setError(null)
  }, [email, error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/founder/auth/confirm`,
        },
      })

      if (authError) {
        setError(authError.message)
        setStatus('error')
      } else {
        setStatus('sent')
      }
    } catch {
      setError('Network error. Check your connection.')
      setStatus('error')
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Founder Access
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pranix AI Labs \u2014 Operational Command Center
        </p>
      </div>

      {status === 'sent' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-sm font-medium text-emerald-800">
            Magic link sent to {email}
          </p>
          <p className="mt-2 text-xs text-emerald-600">
            Check your inbox and tap the link to sign in.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Founder Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@pranixailabs.com"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <>Send Magic Link <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Exclusive access for authorized founders only.
      </p>
    </div>
  )
}

export default function FounderLoginPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
