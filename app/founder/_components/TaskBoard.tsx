'use client'

import React from 'react'
import { Bot, CheckCircle2, AlertCircle, Clock, Zap, User, RefreshCw, Activity, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

type MissionStep = {
  id: string
  mission_id: string
  seq: number
  title: string
  worker: string
  state: 'pending' | 'in_progress' | 'claimed_done' | 'verified' | 'failed' | 'cancelled'
  claim_note: string | null
  artifact_url: string | null
  created_at: string
}

type Mission = {
  id: string
  title: string
  intent: string | null
  product: string | null // matches project_name
  status: 'proposed' | 'active' | 'blocked' | 'completed' | 'cancelled'
  created_at: string
}

type WorkerHeartbeat = {
  worker: string
  status: string
  current_task: string | null
  last_seen_at: string
}

const PRODUCT_LABELS: Record<string, string> = {
  schoolos: 'SchoolOS',
  vidyagrid: 'VidyaGrid',
  quickscanz: 'QuickScanZ',
  insureupi: 'InsureUPI',
  easyvenuez: 'EasyVenuez',
  cart2save: 'Cart2Save',
  quietkeep: 'QuietKeep',
  pranix_agents: 'Agent Engine',
  pranix_site: 'Dashboard / Site',
  pranix_aaria: 'Aaria Voice Service',
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function TaskBoard({
  missions,
  steps,
  heartbeats,
}: {
  missions: Mission[]
  steps: MissionStep[]
  heartbeats: WorkerHeartbeat[]
}) {
  // Map heartbeats by worker
  const hbMap = new Map<string, WorkerHeartbeat>()
  heartbeats.forEach(hb => hbMap.set(hb.worker, hb))

  // Group missions by product/project_name
  const productGroups: Record<string, { productKey: string; missions: Mission[] }> = {}
  
  // Initialize all known products to ensure they render even if empty
  Object.keys(PRODUCT_LABELS).forEach(pKey => {
    productGroups[pKey] = { productKey: pKey, missions: [] }
  })

  // Put missions into groups
  missions.forEach(m => {
    const prodKey = m.product || 'infra' // fallback if null
    const targetKey = PRODUCT_LABELS[prodKey] ? prodKey : 'pranix_agents'
    if (!productGroups[targetKey]) {
      productGroups[targetKey] = { productKey: targetKey, missions: [] }
    }
    productGroups[targetKey].missions.push(m)
  })

  // Filter out product groups that don't have any missions OR are placeholder
  const activeProducts = Object.values(productGroups).filter(group => {
    // Hide placeholders
    if (['incubation_slot_1', 'incubation_slot_2', 'crm', 'language_learning'].includes(group.productKey)) {
      return false
    }
    return true
  })

  // State status badge styling
  const stateBadgeStyle = (state: string) => {
    switch (state) {
      case 'verified':
        return 'text-severity-success bg-severity-success/12 border border-severity-success/20'
      case 'claimed_done':
        return 'text-severity-warn bg-severity-warn/12 border border-severity-warn/20'
      case 'in_progress':
        return 'text-accent bg-accent-subtle border border-accent/20'
      case 'failed':
        return 'text-severity-critical bg-severity-critical/12 border border-severity-critical/20'
      case 'cancelled':
        return 'text-fg-disabled bg-elevated border border-border-subtle'
      default:
        return 'text-fg-muted bg-canvas border border-border-subtle'
    }
  }

  const stateLabel = (state: string) => {
    if (state === 'verified') return 'VERIFIED'
    if (state === 'claimed_done') return 'CLAIMED'
    return state.replace('_', ' ').toUpperCase()
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">Project Task Board (Live)</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {activeProducts.map(group => {
          const label = PRODUCT_LABELS[group.productKey] || group.productKey
          const groupMissions = group.missions

          return (
            <div key={group.productKey} className="space-y-2 border-b border-border-subtle pb-4 last:border-0 last:pb-0">
              {/* Product Header */}
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <h3 className="text-xs font-bold text-fg-primary uppercase tracking-wide">{label}</h3>
                <span className="text-[10px] text-fg-disabled">({groupMissions.length} missions)</span>
              </div>

              {groupMissions.length === 0 ? (
                <p className="text-[11px] text-fg-disabled pl-3.5 italic">No active missions for this product.</p>
              ) : (
                <div className="space-y-3 pl-3.5 mt-2">
                  {groupMissions.map(m => {
                    const missionSteps = steps.filter(s => s.mission_id === m.id)

                    return (
                      <div key={m.id} className="rounded-lg border border-border-subtle bg-canvas/30 p-3 space-y-2.5">
                        {/* Mission Title */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-[12.5px] font-semibold text-fg-primary leading-snug">{m.title}</h4>
                            {m.intent && (
                              <p className="text-[11px] text-fg-muted mt-0.5 italic">"Intent: {m.intent}"</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                            m.status === 'active' ? 'bg-accent/10 text-accent' 
                            : m.status === 'completed' ? 'bg-severity-success/10 text-severity-success'
                            : 'bg-elevated text-fg-muted'
                          }`}>
                            {m.status}
                          </span>
                        </div>

                        {/* Steps List */}
                        {missionSteps.length > 0 ? (
                          <div className="space-y-2 pt-1 border-t border-border-subtle/50">
                            {missionSteps.map(step => {
                              const hb = hbMap.get(step.worker)

                              return (
                                <div key={step.id} className="flex items-start justify-between gap-3 bg-surface p-2 rounded-md border border-border-subtle/60 text-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium text-fg-secondary">
                                      {step.seq + 1}. {step.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-fg-disabled">
                                      <span className="flex items-center gap-1">
                                        <Bot className="h-3 w-3" />
                                        Worker: <span className="text-fg-muted font-medium">{step.worker}</span>
                                      </span>
                                      {hb ? (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="h-2.5 w-2.5" />
                                          Heartbeat: <span className="text-fg-muted font-medium">{relTime(hb.last_seen_at)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-severity-critical">No heartbeat</span>
                                      )}
                                    </div>
                                    {step.claim_note && (
                                      <p className="text-[10px] text-fg-disabled mt-0.5 italic font-sans bg-canvas/40 px-1.5 py-0.5 rounded">
                                        Note: {step.claim_note}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 flex items-center gap-1.5">
                                    {step.artifact_url && (
                                      <a
                                        href={step.artifact_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-accent underline hover:text-accent-hover mr-1"
                                      >
                                        PR/Link
                                      </a>
                                    )}
                                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide ${stateBadgeStyle(step.state)}`}>
                                      {stateLabel(step.state)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[10.5px] text-fg-disabled italic">No steps defined for this mission.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
