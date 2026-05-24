'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function FounderLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam) setError(decodeURIComponent(errParam))
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const nextParam = searchParams.get('next')
      const callbackBase = `${window.location.origin}/founder/auth/confirm`
      const callbackUrl = nextParam
        ? `${callbackBase}?next=${encodeURIComponent(nextParam)}`
        : callbackBase

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      })

      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg-secondary transition-colors duration-fast"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to site
        </Link>

        <h1 className="text-xl font-semibold text-fg-primary">Founder Login</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          Exclusive access for authorized founders only.
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg border border-border-subtle bg-surface p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-severity-success" />
              <span className="text-sm font-medium text-fg-primary">Check your email</span>
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              A magic link was sent to {email}. Tap it to sign in.
              The link expires in 10 minutes.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-fg-secondary mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@pranixailabs.com"
                  className="w-full rounded-md border border-border-strong bg-surface py-2.5 pl-10 pr-3 text-sm text-fg-primary placeholder:text-fg-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-md border border-severity-error/30 bg-severity-error/5 px-3 py-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-error" />
                <p className="text-xs text-severity-error">{error}</p>
              </div>
            )}

            <button
              type="button"
              disabled={loading || !email}
              onClick={handleLogin}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-fg-disabled">
          Only emails listed in the founder allowlist can sign in.
        </p>
      </div>
    </div>
  )
}
