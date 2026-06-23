'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Shield, AlertTriangle, Check, Copy, X, Loader2, PlayCircle, Eye, Power } from 'lucide-react'

export type ClientToken = {
  id: string
  client_name: string
  display_name: string
  token_prefix: string
  active: boolean
  is_founder: boolean
  rate_limit_per_hour: number
  vendor_hint: string | null
  notes: string | null
  created_at: string
}

export function TokensClient({ initialClients }: { initialClients: ClientToken[] }) {
  const router = useRouter()
  const [clients, setClients] = useState<ClientToken[]>(initialClients)
  const [loading, setLoading] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  // Status feedback state instead of toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === text ? null : prev)
    }, 5000)
  }

  // Form states
  const [clientName, setClientName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [notes, setNotes] = useState('')

  const [rateLimit, setRateLimit] = useState(900)
  const [scopes, setScopes] = useState<string[]>(['read'])
  const [vendorHint, setVendorHint] = useState('')

  // New token reveal modal state
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [revealedPrefix, setRevealedPrefix] = useState('')
  const [revealedName, setRevealedName] = useState('')

  const handleScopeChange = (scope: string) => {
    setScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) {
      showStatus('error', 'Client name is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/founder/tokens/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName.trim(),
          display_name: displayName.trim() || clientName.trim(),
          notes: notes.trim() || null,
          is_founder: false,
          rate_limit_per_hour: rateLimit,
          default_scopes: scopes,
          vendor_hint: vendorHint.trim() || null
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mint token')
      }

      setRevealedToken(data.token)
      setRevealedPrefix(data.tokenPrefix)
      setRevealedName(data.client_name)

      // Reset form
      setClientName('')
      setDisplayName('')
      setNotes('')

      setRateLimit(900)
      setScopes(['read'])
      setVendorHint('')

      showStatus('success', 'Token minted successfully!')
      router.refresh()
    } catch (err: any) {
      showStatus('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this token? This action is irreversible.')) {
      return
    }
    setDeactivatingId(id)
    try {
      const res = await fetch(`/api/founder/tokens/${id}/deactivate`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deactivate token')
      }
      showStatus('success', 'Token deactivated successfully')
      router.refresh()
    } catch (err: any) {
      showStatus('error', err.message)
    } finally {
      setDeactivatingId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">API &amp; Gateway Tokens</h1>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
          statusMessage.type === 'success'
            ? 'border-severity-success/30 bg-severity-success/5 text-severity-success'
            : 'border-severity-error/30 bg-severity-error/5 text-severity-error'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Mint Form ── */}
        <div className="lg:col-span-1 rounded-xl border border-border-subtle bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold text-fg-primary uppercase tracking-wide border-b border-border-subtle pb-2">
            Mint New Token
          </h2>
          <form onSubmit={handleMint} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-secondary">Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. perplexity_founder_v2"
                required
                className="w-full rounded-lg border border-border-subtle bg-canvas/50 px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none transition-colors placeholder:text-fg-disabled"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-secondary">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Perplexity AI (V2)"
                className="w-full rounded-lg border border-border-subtle bg-canvas/50 px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none transition-colors placeholder:text-fg-disabled"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-fg-secondary">Notes / Description</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe what this token is used for..."
                rows={2}
                className="w-full rounded-lg border border-border-subtle bg-canvas/50 px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none transition-colors placeholder:text-fg-disabled resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-fg-secondary">Rate Limit (Hourly)</label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={e => setRateLimit(parseInt(e.target.value) || 900)}
                  className="w-full rounded-lg border border-border-subtle bg-canvas/50 px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-fg-secondary">Vendor Hint</label>
                <input
                  type="text"
                  value={vendorHint}
                  onChange={e => setVendorHint(e.target.value)}
                  placeholder="e.g. claude_v1"
                  className="w-full rounded-lg border border-border-subtle bg-canvas/50 px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none transition-colors placeholder:text-fg-disabled"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="text-[11px] font-medium text-fg-secondary block">Scopes</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.includes('read')}
                    onChange={() => handleScopeChange('read')}
                    className="rounded border-border-subtle text-accent focus:ring-accent"
                  />
                  Read
                </label>
                <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.includes('write')}
                    onChange={() => handleScopeChange('write')}
                    className="rounded border-border-subtle text-accent focus:ring-accent"
                  />
                  Write
                </label>
              </div>
            </div>



            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint Gateway Token'
              )}
            </button>
          </form>
        </div>

        {/* ── Tokens List ── */}
        <div className="lg:col-span-2 rounded-xl border border-border-subtle bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold text-fg-primary uppercase tracking-wide border-b border-border-subtle pb-2">
            Active &amp; Historic Tokens
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-fg-disabled font-medium pb-2">
                  <th className="pb-2">Client name</th>
                  <th className="pb-2">Prefix</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-xs text-fg-muted">
                      No gateway tokens registered in mcp_clients.
                    </td>
                  </tr>
                ) : (
                  initialClients.map(c => (
                    <tr key={c.id} className="border-t border-border-subtle text-xs">
                      <td className="py-2.5 pr-2 align-middle">
                        <div className="font-semibold text-fg-primary leading-tight">{c.display_name}</div>
                        <div className="text-[10px] text-fg-muted font-mono mt-0.5">{c.client_name}</div>
                        {c.notes && <div className="text-[10px] text-fg-disabled mt-0.5">{c.notes}</div>}
                      </td>
                      <td className="py-2.5 font-mono text-fg-secondary align-middle">{c.token_prefix}</td>
                      <td className="py-2.5 align-middle">
                        {c.is_founder ? (
                          <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold text-accent flex items-center gap-1 w-max">
                            <Shield className="h-3 w-3" /> Founder
                          </span>
                        ) : (
                          <span className="text-fg-secondary">Client</span>
                        )}
                      </td>
                      <td className="py-2.5 align-middle">
                        {c.active ? (
                          <span className="rounded bg-severity-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-severity-success">
                            Active
                          </span>
                        ) : (
                          <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-fg-disabled">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right align-middle">
                        {c.active && (
                          <button
                            onClick={() => handleDeactivate(c.id)}
                            disabled={deactivatingId === c.id}
                            className="inline-flex items-center gap-1 rounded border border-severity-critical/20 px-2 py-1 text-[11px] font-medium text-severity-critical hover:bg-severity-critical/5 transition-colors disabled:opacity-50"
                          >
                            {deactivatingId === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Power className="h-3 w-3" />
                            )}
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Reveal Modal ── */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2 text-accent">
                <Shield className="h-5 w-5" />
                <h3 className="text-sm font-bold text-fg-primary">Reveal Gateway Secret</h3>
              </div>
              <button
                onClick={() => setRevealedToken(null)}
                className="text-fg-disabled hover:text-fg-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-severity-warn/30 bg-severity-warn/5 p-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-severity-warn shrink-0 mt-0.5" />
                <div className="text-xs text-severity-warn leading-normal font-semibold">
                  WARNING: This secret will be shown ONLY ONCE. 
                  Make sure to copy and save it securely now. You will not be able to retrieve it again.
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-fg-secondary">Client Name</div>
              <div className="text-xs text-fg-primary font-semibold">{revealedName}</div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-fg-secondary">Token Prefix</div>
              <div className="text-xs text-fg-secondary font-mono bg-canvas/30 rounded px-2 py-0.5 border border-border-subtle w-max">
                {revealedPrefix}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-fg-secondary">Plaintext Bearer Token</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-xs font-mono text-fg-primary break-all select-all">
                  {revealedToken}
                </div>
                <button
                  onClick={() => copyToClipboard(revealedToken)}
                  className="rounded-lg bg-accent px-3 py-2 text-white hover:opacity-90 shrink-0 flex items-center justify-center gap-1.5 text-xs font-semibold"
                  title="Copy token"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setRevealedToken(null)}
                className="w-full rounded-lg border border-border-subtle py-2 text-xs font-semibold text-fg-primary hover:bg-elevated transition-colors"
              >
                I have saved this token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
