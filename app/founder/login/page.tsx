'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Shield, ArrowRight, Loader2, Eye, EyeOff, Mail, KeyRound } from 'lucide-react'

type Mode = 'password' | 'magic'
type Status = 'idle' | 'loading' | 'sent' | 'reset_sent' | 'error' | 'success'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorParam = searchParams.get('error')
  const nextParam = searchParams.get('next') ?? '/founder'

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(errorParam)

  useEffect(() => {
    if ((email.length > 0 || password.length > 0) && error) setError(null)
  }, [email, password, error])

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : authError.message
        )
        setStatus('error')
        return
      }

      setStatus('success')
      router.replace(
        nextParam.startsWith('/founder') && !nextParam.startsWith('//')
          ? nextParam
          : '/founder'
      )
    } catch {
      setError('Network error. Check your connection.')
      setStatus('error')
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
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

  // Forgot / first-time password: sends a recovery link that lands on
  // /founder/auth/reset where the founder sets a password they choose.
  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your founder email first, then tap “Forgot password”.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError(null)
    try {
      const supabase = createBrowserClient()
      // Recovery reuses the proven magic-link (token_hash/verifyOtp) flow, which
      // is cross-device safe. resetPasswordForEmail used PKCE and failed on
      // mobile (code_verifier missing when the email opens in another browser).
      const { error: resetError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/founder/auth/confirm?next=/founder/account`,
        },
      })
      if (resetError) {
        setError(resetError.message)
        setStatus('error')
      } else {
        setStatus('reset_sent')
      }
    } catch {
      setError('Network error. Check your connection.')
      setStatus('error')
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
             style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Founder Access
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pranix AI Labs — Operational Command Center
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 mb-6">
        <button
          type="button"
          onClick={() => { setMode('password'); setError(null); setStatus('idle') }}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === 'password'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => { setMode('magic'); setError(null); setStatus('idle') }}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === 'magic'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Magic link sent confirmation */}
      {status === 'sent' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <Mail className="mx-auto h-8 w-8 text-emerald-600 mb-3" />
          <p className="text-sm font-medium text-emerald-800">
            Magic link sent to {email}
          </p>
          <p className="mt-2 text-xs text-emerald-600">
            Check your inbox and tap the link to sign in.
          </p>
        </div>
      )}

      {/* Password reset link sent confirmation */}
      {status === 'reset_sent' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-blue-600 mb-3" />
          <p className="text-sm font-medium text-blue-800">
            Secure sign-in link sent to {email}
          </p>
          <p className="mt-2 text-xs text-blue-600">
            Tap the link in your inbox. You&apos;ll land on your Account page,
            where you can set a new password. Works for first-time setup or if
            you forgot your password.
          </p>
        </div>
      )}

      {/* Password form */}
      {mode === 'password' && status !== 'sent' && status !== 'reset_sent' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@pranixailabs.com"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot / set password
            </button>
            <button
              type="button"
              onClick={() => { setMode('magic'); setError(null); setStatus('idle') }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Use magic link instead
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !email || !password}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}
          >
            {status === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
            ) : (
              <>Sign In <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      )}

      {/* Magic link form */}
      {mode === 'magic' && status !== 'sent' && status !== 'reset_sent' && (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email-magic" className="block text-sm font-medium text-slate-700 mb-1">
              Founder Email
            </label>
            <input
              id="email-magic"
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
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}
          >
            {status === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <>Send Magic Link <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center space-y-1.5">
        <button
          type="button"
          onClick={() => router.push('/founder/break-glass')}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Locked out & email not working? Break-glass recovery →
        </button>
        <p className="text-xs text-slate-400">Exclusive access for authorized founders only.</p>
      </div>
    </div>
  )
}

export default function FounderLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <Suspense fallback={<div className="min-h-screen" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
