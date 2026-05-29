'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Eye, EyeOff, KeyRound, LogOut, CheckCircle2, UserCircle } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function FounderAccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [save, setSave] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [secret, setSecret] = useState('')
  const [secretSave, setSecretSave] = useState<SaveState>('idle')
  const [secretError, setSecretError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSave('saving')
    try {
      const supabase = createBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); setSave('error'); return }
      setSave('saved')
      setPassword(''); setConfirm('')
      setTimeout(() => setSave('idle'), 3000)
    } catch {
      setError('Network error. Check your connection.')
      setSave('error')
    }
  }

  async function handleSetSecret(e: React.FormEvent) {
    e.preventDefault()
    setSecretError(null)
    if (secret.length < 8) { setSecretError('Recovery secret must be at least 8 characters.'); return }
    setSecretSave('saving')
    try {
      const res = await fetch('/api/founder/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_secret', secret }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setSecretError(json?.error || 'Could not save.'); setSecretSave('error'); return }
      setSecretSave('saved')
      setSecret('')
      setTimeout(() => setSecretSave('idle'), 3000)
    } catch {
      setSecretError('Network error. Check your connection.')
      setSecretSave('error')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } finally {
      router.replace('/founder/login')
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <UserCircle className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Account</h1>
      </div>

      {/* Identity */}
      <section className="rounded-lg border border-border-subtle bg-surface p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-medium">Signed in as</p>
        <p className="text-sm text-fg-primary font-mono">{email ?? '…'}</p>
        <p className="text-[11px] text-fg-muted">
          Password sign-in is enabled for this account. Use the form below to change it anytime.
        </p>
      </section>

      {/* Change password */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Change Password</h2>
        <form onSubmit={handleChangePassword} className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              autoComplete="new-password"
              className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 pr-10 text-sm text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-disabled hover:text-fg-muted">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-disabled focus:outline-none focus:ring-2 focus:ring-accent/30"
          />

          {error && (
            <div className="rounded-lg border border-severity-error/30 bg-severity-error/10 px-3 py-2 text-xs text-severity-error">
              {error}
            </div>
          )}
          {save === 'saved' && (
            <div className="flex items-center gap-2 text-xs text-severity-success">
              <CheckCircle2 className="h-4 w-4" /> Password updated.
            </div>
          )}

          <button
            type="submit"
            disabled={save === 'saving' || !password || !confirm}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save === 'saving' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><KeyRound className="h-4 w-4" /> Update Password</>
            )}
          </button>
        </form>
      </section>

      {/* Sign out */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Session</h2>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface px-4 py-2.5 text-sm font-medium text-fg-primary transition-colors hover:bg-elevated disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sign Out
        </button>
      </section>
    </div>
  )
}
