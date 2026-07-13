'use client'

import { useState } from 'react'
import { Play, Square, Check, Loader2, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react'

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
    planned?: any[]
  }
  created_at: string
}

export function FounderAlertInbox({ initialAlerts }: { initialAlerts: AlertItem[] }) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvedIds, setApprovedIds] = useState<Record<string, string>>({}) // alertId -> successMsg

  const playAudio = (alertId: string, base64Audio: string) => {
    if (playingId === alertId && audioObj) {
      audioObj.pause()
      setPlayingId(null)
      setAudioObj(null)
      return
    }

    if (audioObj) {
      audioObj.pause()
    }

    const audio = new Audio(base64Audio)
    audio.onended = () => {
      setPlayingId(null)
      setAudioObj(null)
    }
    setPlayingId(alertId)
    setAudioObj(audio)
    void audio.play().catch(err => {
      console.error('Audio play failed:', err)
      setPlayingId(null)
      setAudioObj(null)
    })
  }

  const handleApprove = async (alertId: string, approveUrl: string) => {
    if (!approveUrl) return
    setApprovingId(alertId)
    try {
      // Fetch the approval url directly (possession of token is auth)
      const res = await fetch(approveUrl)
      if (!res.ok) {
        throw new Error(`Approval failed with status: ${res.status}`)
      }
      const data = await res.json()
      setApprovedIds(prev => ({
        ...prev,
        [alertId]: data.note || 'Plan approved and enqueued for execution.'
      }))
      
      // If approval returned synthesized audio feedback, play it
      if (data.voice_out_audio) {
        playAudio(alertId, data.voice_out_audio)
      }
    } catch (err: any) {
      console.error('Failed to approve command:', err)
      alert(`Approval error: ${err.message || 'Server request failed'}`)
    } finally {
      setApprovingId(null)
    }
  }

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-fg-primary">Founder Alert Inbox ({alerts.length})</h2>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isCritical = alert.level === 'critical'
          const isApproved = !!approvedIds[alert.id]
          const isApproving = approvingId === alert.id
          const hasAudio = !!alert.context?.voice_out_audio
          const hasApprove = !!alert.context?.approve_url

          return (
            <div
              key={alert.id}
              className={`rounded-lg border p-3.5 space-y-2 transition-colors ${
                isApproved
                  ? 'border-severity-success/30 bg-severity-success/[0.02]'
                  : isCritical
                  ? 'border-severity-critical/20 bg-severity-critical/[0.02]'
                  : 'border-severity-warn/25 bg-severity-warn/[0.02]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-severity-critical/10 text-severity-critical'
                        : 'bg-severity-warn/10 text-severity-warn'
                    }`}
                  >
                    {alert.level}
                  </span>
                  <span className="text-[10px] text-fg-disabled font-medium">from {alert.source}</span>
                </div>
                <span className="text-[10px] text-fg-disabled tabular-nums">
                  {new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Title & Body */}
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-fg-primary leading-tight">{alert.title}</p>
                <p className="text-[12px] text-fg-secondary leading-relaxed whitespace-pre-wrap">{alert.body}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center flex-wrap gap-2 pt-1">
                {hasAudio && !isApproved && (
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

                {hasApprove && !isApproved && (
                  <button
                    onClick={() => handleApprove(alert.id, alert.context!.approve_url!)}
                    disabled={isApproving}
                    className="inline-flex items-center gap-1 rounded-md bg-accent text-canvas px-3 py-1 text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isApproving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span>One-Tap Approve</span>
                  </button>
                )}

                {isApproved && (
                  <div className="flex items-center gap-1.5 text-[11px] text-severity-success font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{approvedIds[alert.id]}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
