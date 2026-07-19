'use client'

import React, { useState } from 'react'
import {
  Shield, ShieldCheck, Zap, Bot, Video, Mic, CheckCircle2,
  AlertTriangle, Loader2, Play, Square, Power, ChevronRight, Fingerprint
} from 'lucide-react'
import { decideGrantAction } from '../approvals/actions'

type PendingGrant = {
  id: string
  scope: string
  resource_pattern: string
  requested_task: string | null
  expires_at: string
  created_at?: string
}

type ProviderStatus = {
  provider_name: string
  tier: number
  enabled: boolean
  health_status: string
}

type JarvisStatusPaneProps = {
  initialGrants: PendingGrant[]
  providers: ProviderStatus[]
  recentVideos?: any[]
}

export function JarvisStatusPane({
  initialGrants,
  providers,
  recentVideos = []
}: JarvisStatusPaneProps) {
  const [grants, setGrants] = useState<PendingGrant[]>(initialGrants)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<Record<string, { ok: boolean; msg: string }>>({})

  // LLM Failover chain visualization data
  const failoverChain = [
    { name: 'gemini', label: 'Gemini Flash (Free)', type: 'primary', quota: '15 RPM' },
    { name: 'groq', label: 'Groq / Qwen (Free)', type: 'secondary', quota: '30 RPM' },
    { name: 'openrouter', label: 'OpenRouter (Free)', type: 'tertiary', quota: '10 RPM' },
    { name: 'anthropic', label: 'Claude / GPT (Paid)', type: 'fallback', quota: 'On Demand' }
  ]

  async function handleApproval(grantId: string, action: 'allow_session' | 'deny') {
    setBusyId(grantId)
    try {
      const fd = new FormData()
      fd.append('grant_id', grantId)
      fd.append('action', action)
      
      const res = await decideGrantAction(null, fd)
      if (res.ok) {
        setStatusMsg(prev => ({ ...prev, [grantId]: { ok: true, msg: action === 'allow_session' ? 'Approved (8h)' : 'Denied' } }))
        // Remove from list after 1.5 seconds
        setTimeout(() => {
          setGrants(prev => prev.filter(g => g.id !== grantId))
        }, 1500)
      } else {
        setStatusMsg(prev => ({ ...prev, [grantId]: { ok: false, msg: res.message || 'Action failed' } }))
      }
    } catch (err: any) {
      setStatusMsg(prev => ({ ...prev, [grantId]: { ok: false, msg: err.message || 'Error occurred' } }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Status Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. JARVIS Status & LLM Router */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <div className="flex items-center gap-1.5">
                <Bot className="h-4.5 w-4.5 text-accent animate-pulse" />
                <span className="text-[12px] font-bold text-fg-primary uppercase tracking-wide">JARVIS Brain Router</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-severity-success/12 text-severity-success px-2 py-0.5 rounded-full font-semibold">
                <CheckCircle2 className="h-3 w-3" /> ACTIVE
              </span>
            </div>
            
            <p className="text-[11px] text-fg-muted mb-3">
              LLM failover router automatically falls back on rate limit exhaustion.
            </p>
            
            <div className="space-y-2">
              {failoverChain.map((chain, index) => {
                const prov = providers.find(p => p.provider_name.toLowerCase() === chain.name)
                const isHealthy = prov ? prov.health_status === 'ok' : true
                const isEnabled = prov ? prov.enabled : true

                return (
                  <div key={chain.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-bg border border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-fg-disabled">#{index + 1}</span>
                      <span className="font-semibold text-fg-primary">{chain.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-fg-disabled">{chain.quota}</span>
                      <span className={`h-2 w-2 rounded-full ${isHealthy && isEnabled ? 'bg-severity-success' : 'bg-severity-critical'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px]">
            <span className="text-fg-muted">Router Protocol:</span>
            <span className="font-mono font-bold text-accent">free-first-failover:v1.3</span>
          </div>
        </div>

        {/* 2. Hands & Voice (Aaria + browser-use) */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <div className="flex items-center gap-1.5">
                <Mic className="h-4.5 w-4.5 text-accent" />
                <span className="text-[12px] font-bold text-fg-primary uppercase tracking-wide">Hands & Voice</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-severity-success/12 text-severity-success px-2 py-0.5 rounded-full font-semibold">
                ONLINE
              </span>
            </div>

            <p className="text-[11px] text-fg-muted mb-4">
              Aaria speech engine and browser automation telemetry.
            </p>

            <div className="space-y-3">
              {/* Voice Node */}
              <div className="flex items-start justify-between text-xs">
                <div>
                  <p className="font-semibold text-fg-primary">🎙 Aaria Voice NLU (Render)</p>
                  <p className="text-[10px] text-fg-disabled mt-0.5">https://pranix-aaria.onrender.com</p>
                </div>
                <span className="text-[10px] text-severity-success bg-severity-success/10 px-2 py-0.5 rounded font-bold font-mono">HEALTHY</span>
              </div>

              {/* Browser Hands */}
              <div className="flex items-start justify-between text-xs pt-2 border-t border-border-subtle">
                <div>
                  <p className="font-semibold text-fg-primary">🤖 Browser Agent (browser-use)</p>
                  <p className="text-[10px] text-fg-disabled mt-0.5">Headless GHA Runner Dispatcher</p>
                </div>
                <span className="text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded font-bold font-mono">IDLE / ACTIVE</span>
              </div>
              
              {/* Passkey MFA Status */}
              <div className="flex items-start justify-between text-xs pt-2 border-t border-border-subtle">
                <div>
                  <p className="font-semibold text-fg-primary">🔑 Dashboard Passkey MFA</p>
                  <p className="text-[10px] text-fg-disabled mt-0.5">F.2C biometric session security</p>
                </div>
                <span className="flex items-center gap-0.5 text-[10px] text-severity-success font-bold font-mono">
                  <Fingerprint className="h-3.5 w-3.5 text-severity-success shrink-0" /> SECURED
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px]">
            <span className="text-fg-muted">Sarvam Model:</span>
            <span className="font-mono text-fg-secondary">saaras-bulbul:v1 (Telugu)</span>
          </div>
        </div>

        {/* 3. J4 Content Factory / Video Queue */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <div className="flex items-center gap-1.5">
                <Video className="h-4.5 w-4.5 text-accent" />
                <span className="text-[12px] font-bold text-fg-primary uppercase tracking-wide">Video Generator (J4)</span>
              </div>
              <span className="text-[10px] text-fg-disabled font-mono">Queue List</span>
            </div>

            <p className="text-[11px] text-fg-muted mb-3">
              Headless Remotion render results & pipeline status logs.
            </p>

            <div className="space-y-2">
              {recentVideos.length === 0 ? (
                <div className="text-center py-4 bg-bg border border-border-subtle rounded-lg text-[11px] text-fg-disabled">
                  No video renders found.
                </div>
              ) : (
                recentVideos.slice(0, 3).map(v => (
                  <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-bg border border-border-subtle">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg-primary truncate uppercase">{v.product}</p>
                      <p className="text-[9px] text-fg-disabled font-mono">{v.template_type}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      v.status === 'completed' ? 'bg-severity-success/15 text-severity-success'
                      : v.status === 'failed' ? 'bg-severity-critical/15 text-severity-critical'
                      : 'bg-severity-warn/15 text-severity-warn animate-pulse'
                    }`}>{v.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px]">
            <span className="text-fg-muted">Headless render pipeline:</span>
            <span className="font-mono text-fg-secondary">Remotion CLI</span>
          </div>
        </div>

      </div>

      {/* ── One-Tap Phone Approvals Pane ── */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-border-subtle pb-2">
          <Shield className="h-4.5 w-4.5 text-accent" />
          <h2 className="text-[12px] font-bold text-fg-primary uppercase tracking-wide">One-Tap approvals (Command Centre)</h2>
        </div>

        {grants.length === 0 ? (
          <div className="text-center py-6 text-fg-muted">
            <CheckCircle2 className="mx-auto h-7 w-7 text-severity-success mb-2" />
            <p className="text-xs font-semibold">All Grants Clear</p>
            <p className="text-[11px] text-fg-disabled">No permission requests awaiting mobile approval.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grants.map(grant => {
              const decided = statusMsg[grant.id]
              const processing = busyId === grant.id

              return (
                <div key={grant.id} className="rounded-lg border border-border-subtle bg-bg p-3 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="rounded bg-accent-subtle text-accent px-1.5 py-0.5 font-bold font-mono">
                        {grant.scope.toUpperCase()}
                      </span>
                      <span className="text-fg-disabled font-medium">Expires in 15m</span>
                    </div>
                    <p className="text-xs font-bold text-fg-primary">{grant.resource_pattern}</p>
                    {grant.requested_task && (
                      <p className="text-[10px] text-fg-muted italic mt-0.5">Task: {grant.requested_task}</p>
                    )}
                  </div>

                  {decided ? (
                    <div className={`text-center py-1.5 rounded-lg text-xs font-semibold ${
                      decided.ok ? 'bg-severity-success/15 text-severity-success' : 'bg-severity-critical/15 text-severity-critical'
                    }`}>
                      {decided.msg}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproval(grant.id, 'deny')}
                        disabled={processing}
                        className="flex-1 h-9 rounded-lg border border-severity-critical text-severity-critical text-xs font-semibold hover:bg-severity-critical/10 transition-colors"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleApproval(grant.id, 'allow_session')}
                        disabled={processing}
                        className="flex-1 h-9 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
