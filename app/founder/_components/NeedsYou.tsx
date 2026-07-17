'use client'

import { useState } from 'react'
import { ShieldAlert, Check, X, Clock, Play, Square, Loader2, CheckCircle2, Lightbulb, BrainCircuit, Ban, Info, AlertTriangle } from 'lucide-react'
import { decideGrantAction } from '../approvals/actions'
import { triageIdeaAction } from '../actions'

// Types
type AlertItem = {
  id: string
  level: string
  source: string
  title: string
  body: string
  context?: {
    command_id?: string
    approve_url?: string
    voice_out_audio?: string
  }
  created_at: string
}

type PendingGrant = {
  id: string
  scope: string
  resource_pattern: string
  requested_task: string | null
  expires_at: string
}

type Recommendation = {
  recommendation_id: string
  category: string
  title: string
  summary: string
  risk_level: string
  recommended_action: string
  source_task_id: string | null
  status: string
  generated_at: string
}

type PendingIdea = {
  id: string
  text: string
  status: string
  created_at: string
}

type NeedsYouItem = 
  | { type: 'alert'; id: string; item: AlertItem; impactScore: number; created_at: string }
  | { type: 'grant'; id: string; item: PendingGrant; impactScore: number; created_at: string }
  | { type: 'recommendation'; id: string; item: Recommendation; impactScore: number; created_at: string }
  | { type: 'idea'; id: string; item: PendingIdea; impactScore: number; created_at: string }

export function NeedsYou({
  initialAlerts,
  pendingGrants,
  pendingRecommendations,
  pendingIdeas,
}: {
  initialAlerts: AlertItem[]
  pendingGrants: PendingGrant[]
  pendingRecommendations: Recommendation[]
  pendingIdeas: PendingIdea[]
}) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts)
  const [ideas, setIdeas] = useState<PendingIdea[]>(pendingIdeas)
  const [recs, setRecs] = useState<Recommendation[]>(pendingRecommendations)
  const [grants, setGrants] = useState<PendingGrant[]>(pendingGrants)

  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null)
  
  // Action tracking
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [decidedIds, setDecidedIds] = useState<Record<string, { ok: boolean; msg: string }>>({})

  // Helper to play audio
  const playAudio = (id: string, base64Audio: string) => {
    if (playingId === id && audioObj) {
      audioObj.pause()
      setPlayingId(null)
      setAudioObj(null)
      return
    }
    if (audioObj) audioObj.pause()

    const audio = new Audio(base64Audio)
    audio.onended = () => {
      setPlayingId(null)
      setAudioObj(null)
    }
    setPlayingId(id)
    setAudioObj(audio)
    void audio.play().catch(err => {
      console.error('Audio playback failed:', err)
      setPlayingId(null)
      setAudioObj(null)
    })
  }

  // --- Actions ---
  const handleApproveAlert = async (alertId: string, approveUrl: string) => {
    setApprovingId(alertId)
    try {
      const res = await fetch(approveUrl)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      setDecidedIds(prev => ({
        ...prev,
        [alertId]: { ok: true, msg: data.note || 'Approved successfully.' }
      }))
      if (data.voice_out_audio) {
        playAudio(alertId, data.voice_out_audio)
      }
    } catch (err: any) {
      setDecidedIds(prev => ({
        ...prev,
        [alertId]: { ok: false, msg: err.message || 'Error occurred.' }
      }))
    } finally {
      setApprovingId(null)
    }
  }

  const handleGrantDecision = async (grantId: string, action: 'allow_session' | 'deny') => {
    setApprovingId(grantId)
    try {
      const fd = new FormData()
      fd.append('grant_id', grantId)
      fd.append('action', action)
      const res = await decideGrantAction(null, fd)
      setDecidedIds(prev => ({
        ...prev,
        [grantId]: { ok: res.ok, msg: res.message }
      }))
    } catch (err: any) {
      setDecidedIds(prev => ({
        ...prev,
        [grantId]: { ok: false, msg: err.message || 'Error occurred.' }
      }))
    } finally {
      setApprovingId(null)
    }
  }

  const handleRecDecision = async (recId: string, action: 'approved' | 'dismissed', rec: Recommendation) => {
    setApprovingId(recId)
    try {
      const recRes = await fetch('/api/founder/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recId, action })
      })
      if (!recRes.ok) throw new Error('Failed to update recommendation status')

      if (action === 'approved') {
        const opRes = await fetch('/api/founder/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            recommendation_id: recId,
            title: rec.title,
            category: rec.category,
            risk_level: rec.risk_level,
            summary: rec.summary,
            source_task_id: rec.source_task_id
          })
        })
        if (!opRes.ok) console.warn('Operation creation failed, rec was marked approved')
      }

      setDecidedIds(prev => ({
        ...prev,
        [recId]: { ok: true, msg: action === 'approved' ? 'Recommendation approved.' : 'Recommendation dismissed.' }
      }))
    } catch (err: any) {
      setDecidedIds(prev => ({
        ...prev,
        [recId]: { ok: false, msg: err.message || 'Error occurred.' }
      }))
    } finally {
      setApprovingId(null)
    }
  }

  const handleIdeaDecision = async (ideaId: string, action: 'approved' | 'dismissed') => {
    setApprovingId(ideaId)
    try {
      const res = await triageIdeaAction(ideaId, action)
      setDecidedIds(prev => ({
        ...prev,
        [ideaId]: { ok: res.ok, msg: res.message }
      }))
    } catch (err: any) {
      setDecidedIds(prev => ({
        ...prev,
        [ideaId]: { ok: false, msg: err.message || 'Error occurred.' }
      }))
    } finally {
      setApprovingId(null)
    }
  }

  // --- Collapsing logic ---
  // Collapses alerts with titles matching "Missing secret: <credential>"
  const collapsedAlerts: AlertItem[] = []
  const secretAlertsMap = new Map<string, AlertItem[]>()

  for (const alert of alerts) {
    if (alert.title.toLowerCase().startsWith('missing secret:')) {
      const key = alert.title.substring('missing secret:'.length).trim()
      if (!secretAlertsMap.has(key)) {
        secretAlertsMap.set(key, [])
      }
      secretAlertsMap.get(key)!.push(alert)
    } else {
      collapsedAlerts.push(alert)
    }
  }

  // Generate collapsed secret alerts
  for (const [key, list] of secretAlertsMap.entries()) {
    const first = list[0]
    collapsedAlerts.push({
      ...first,
      body: list.map(item => item.body).join('\n'), // Keep all details or parse
      title: `Missing secret: ${key}`,
      context: {
        ...first.context,
        // Carry count or list of unique paths
      }
    })
  }

  // Function to parse missing secret body for plain language
  const parseMissingSecret = (body: string) => {
    const becauseIndex = body.indexOf(' because ')
    let whatBreaks = ''
    let whereToPaste = ''
    if (becauseIndex !== -1) {
      whatBreaks = body.substring(0, becauseIndex)
      const periodIndex = body.indexOf('.', becauseIndex)
      if (periodIndex !== -1) {
        whereToPaste = body.substring(periodIndex + 1).trim()
      }
    } else {
      whatBreaks = body
    }
    whatBreaks = whatBreaks.replace(/_/g, ' ')
    whatBreaks = whatBreaks.charAt(0).toUpperCase() + whatBreaks.slice(1)
    return { whatBreaks, whereToPaste }
  }

  // --- Build unified sorted list ---
  const unifiedItems: NeedsYouItem[] = []

  collapsedAlerts.forEach(alert => {
    let score = 40 // Default low
    if (alert.level === 'critical') score = 100
    else if (alert.level === 'error') score = 80
    else if (alert.level === 'warn') score = 60

    unifiedItems.push({
      type: 'alert',
      id: alert.id,
      item: alert,
      impactScore: score,
      created_at: alert.created_at
    })
  })

  grants.forEach(grant => {
    unifiedItems.push({
      type: 'grant',
      id: grant.id,
      item: grant,
      impactScore: 90, // High Priority
      created_at: grant.expires_at // Use expires_at or placeholder
    })
  })

  recs.forEach(rec => {
    let score = 55
    if (rec.risk_level === 'critical') score = 85
    else if (rec.risk_level === 'high') score = 75

    unifiedItems.push({
      type: 'recommendation',
      id: rec.recommendation_id,
      item: rec,
      impactScore: score,
      created_at: rec.generated_at
    })
  })

  ideas.forEach(idea => {
    unifiedItems.push({
      type: 'idea',
      id: idea.id,
      item: idea,
      impactScore: 50, // Medium-low priority
      created_at: idea.created_at
    })
  })

  // Sort descending by impactScore, then by created_at descending
  unifiedItems.sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (unifiedItems.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-6 text-center text-fg-muted">
        <CheckCircle2 className="mx-auto h-8 w-8 text-severity-success mb-2" />
        <p className="text-sm font-semibold">Inbox Clear</p>
        <p className="text-xs">No pending approvals, alerts, or triage tasks.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-4.5 w-4.5 text-accent" />
        <h2 className="text-sm font-semibold text-fg-primary">Needs You ({unifiedItems.length})</h2>
      </div>

      <div className="space-y-3">
        {unifiedItems.map(item => {
          const isDecided = !!decidedIds[item.id]
          const decision = decidedIds[item.id]
          const isProcessing = approvingId === item.id

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3.5 space-y-2.5 transition-colors ${
                isDecided
                  ? decision.ok
                    ? 'border-severity-success/30 bg-severity-success/[0.02]'
                    : 'border-severity-critical/30 bg-severity-critical/[0.02]'
                  : item.impactScore >= 85
                  ? 'border-severity-critical/20 bg-severity-critical/[0.015]'
                  : 'border-border-subtle'
              }`}
            >
              {/* Card Header / Badge */}
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
                      item.impactScore >= 85
                        ? 'bg-severity-critical/10 text-severity-critical'
                        : 'bg-severity-warn/10 text-severity-warn'
                    }`}
                  >
                    Priority {item.impactScore}
                  </span>
                  <span className="text-fg-disabled font-medium capitalize">{item.type}</span>
                </div>
                <span className="text-fg-disabled tabular-nums">
                  {new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Card Body */}
              {item.type === 'alert' && (() => {
                const alert = item.item
                const isSecret = alert.title.toLowerCase().startsWith('missing secret:')
                const parsed = isSecret ? parseMissingSecret(alert.body) : null
                const hasAudio = !!alert.context?.voice_out_audio
                const hasApprove = !!alert.context?.approve_url

                return (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold text-fg-primary leading-tight">{alert.title}</p>
                    {isSecret && parsed ? (
                      <div className="text-[12px] space-y-1.5 bg-canvas p-2.5 rounded border border-border-subtle">
                        <div>
                          <span className="font-semibold text-severity-critical text-[11px] block uppercase tracking-wide">What breaks:</span>
                          <span className="text-fg-secondary">{parsed.whatBreaks}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-accent text-[11px] block uppercase tracking-wide">Where to paste:</span>
                          <span className="text-fg-muted font-mono break-all">{parsed.whereToPaste}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-fg-secondary leading-relaxed whitespace-pre-wrap">{alert.body}</p>
                    )}

                    {/* Action controls */}
                    {!isDecided && (hasAudio || hasApprove) && (
                      <div className="flex items-center gap-2 pt-1">
                        {hasAudio && (
                          <button
                            onClick={() => playAudio(alert.id, alert.context!.voice_out_audio!)}
                            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-canvas px-2.5 py-1 text-[11px] font-medium text-fg-primary hover:bg-elevated transition-colors"
                          >
                            {playingId === alert.id ? (
                              <>
                                <Square className="h-3 w-3 text-severity-critical fill-severity-critical" />
                                <span>Stop Voice</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 text-accent fill-accent" />
                                <span>Listen Voice</span>
                              </>
                            )}
                          </button>
                        )}
                        {hasApprove && (
                          <button
                            onClick={() => handleApproveAlert(alert.id, alert.context!.approve_url!)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 rounded-md bg-accent text-canvas px-3 py-1.5 text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            <span>One-Tap Approve</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {item.type === 'grant' && (() => {
                const grant = item.item
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[13px] font-semibold text-fg-primary leading-tight">Access Grant Request</p>
                      <p className="text-[12px] text-fg-secondary mt-1">
                        Requesting <strong className="text-accent">{grant.scope}</strong> access to <strong className="text-fg-primary">{grant.resource_pattern}</strong>.
                      </p>
                      {grant.requested_task && (
                        <p className="text-[11.5px] text-fg-muted mt-0.5 italic">For Task: {grant.requested_task}</p>
                      )}
                    </div>

                    {!isDecided && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleGrantDecision(grant.id, 'allow_session')}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 rounded-md bg-severity-success text-canvas px-3 py-1.5 text-[11px] font-medium hover:bg-severity-success/95 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          <span>Approve (8h)</span>
                        </button>
                        <button
                          onClick={() => handleGrantDecision(grant.id, 'deny')}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 rounded-md bg-severity-critical/10 border border-severity-critical/20 text-severity-critical px-3 py-1.5 text-[11px] font-medium hover:bg-severity-critical/15 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Deny</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {item.type === 'recommendation' && (() => {
                const rec = item.item
                return (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[13px] font-semibold text-fg-primary leading-tight">{rec.title}</p>
                      <p className="text-[12px] text-fg-secondary mt-1">{rec.summary}</p>
                      {rec.recommended_action && (
                        <p className="text-[11.5px] text-fg-muted mt-1">
                          <strong className="text-accent font-medium">Recommended:</strong> {rec.recommended_action}
                        </p>
                      )}
                    </div>

                    {!isDecided && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleRecDecision(rec.recommendation_id, 'approved', rec)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-md bg-severity-success text-canvas px-3 py-1.5 text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRecDecision(rec.recommendation_id, 'dismissed', rec)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-md bg-elevated border border-border-subtle text-fg-muted px-3 py-1.5 text-[11px] font-medium hover:bg-canvas disabled:opacity-50"
                        >
                          <span>Dismiss</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {item.type === 'idea' && (() => {
                const idea = item.item
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[13px] font-semibold text-fg-primary leading-tight">Captured Idea for Triage</p>
                      <p className="text-[12px] text-fg-secondary mt-1 italic">"{idea.text}"</p>
                    </div>

                    {!isDecided && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleIdeaDecision(idea.id, 'approved')}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-md bg-accent text-canvas px-3 py-1.5 text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span>Approve Idea</span>
                        </button>
                        <button
                          onClick={() => handleIdeaDecision(idea.id, 'dismissed')}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-md bg-elevated border border-border-subtle text-fg-muted px-3 py-1.5 text-[11px] font-medium hover:bg-canvas disabled:opacity-50"
                        >
                          <span>Dismiss</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Decision Verdict banner */}
              {isDecided && (
                <div className={`flex items-center gap-1.5 text-[11.5px] font-medium ${
                  decision!.ok ? 'text-severity-success' : 'text-severity-critical'
                }`}>
                  {decision!.ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  <span>{decision!.msg}</span>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
