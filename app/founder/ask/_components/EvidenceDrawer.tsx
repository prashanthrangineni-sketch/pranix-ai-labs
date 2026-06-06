'use client'

import { useEffect, useRef } from 'react'
import {
  X, Bot, Github, Database, Globe, Brain, ListChecks,
  ShieldAlert, CheckCircle2, AlertCircle, Clock, Hash, Layers,
} from 'lucide-react'

// ── Evidence shape (mirrors what route.ts attaches) ──────────────────────────
export type EvidenceUsed = {
  github?:    { summary: string; files_checked?: number; commits_checked?: number }
  supabase?:  { summary: string; tables_queried?: number; rows_read?: number }
  vercel?:    { summary: string; deployments_checked?: number }
  memory?:    { count: number; summary?: string }
  tasks?:     { count: number; summary?: string }
}

export type EvidenceMeta = {
  model_used?:        string
  confidence?:        number          // 0–1 float
  task_id?:           string
  workspace_id?:      string
  gathered_at?:       string          // ISO
  speculation_flag?:  boolean
  evidence_used?:     EvidenceUsed
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function confidenceLabel(c?: number): { label: string; color: string } {
  if (c === undefined || c === null) return { label: 'Unknown', color: 'text-fg-disabled' }
  if (c >= 0.8) return { label: `High (${Math.round(c * 100)}%)`, color: 'text-success' }
  if (c >= 0.5) return { label: `Medium (${Math.round(c * 100)}%)`, color: 'text-severity-warn' }
  return { label: `Low (${Math.round(c * 100)}%)`, color: 'text-severity-critical' }
}

function relTime(iso?: string) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// ── EvidenceDrawer ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  meta: EvidenceMeta
}

export function EvidenceDrawer({ open, onClose, meta }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Trap focus and prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const conf = confidenceLabel(meta.confidence)
  const ev   = meta.evidence_used ?? {}
  const sources = [
    ev.github   && { icon: Github,     label: 'GitHub',   detail: ev.github.summary,   extra: ev.github.files_checked != null ? `${ev.github.files_checked} files` : null },
    ev.supabase && { icon: Database,   label: 'Supabase', detail: ev.supabase.summary,  extra: ev.supabase.rows_read != null ? `${ev.supabase.rows_read} rows` : null },
    ev.vercel   && { icon: Globe,      label: 'Vercel',   detail: ev.vercel.summary,    extra: ev.vercel.deployments_checked != null ? `${ev.vercel.deployments_checked} deployments` : null },
    ev.memory   && { icon: Brain,      label: 'Memory',   detail: ev.memory.summary ?? `${ev.memory.count} entr${ev.memory.count === 1 ? 'y' : 'ies'} recalled`, extra: null },
    ev.tasks    && { icon: ListChecks, label: 'Tasks',    detail: ev.tasks.summary  ?? `${ev.tasks.count} task${ev.tasks.count === 1 ? '' : 's'} reviewed`, extra: null },
  ].filter(Boolean) as { icon: React.ElementType; label: string; detail: string; extra: string | null }[]

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence Drawer"
      className={[
        // Mobile: slide up from bottom as a bottom sheet
        'fixed z-[60] bg-surface flex flex-col',
        // Mobile
        'bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl',
        // Desktop: right-side drawer
        'lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:w-96 lg:max-h-full lg:rounded-none lg:rounded-l-2xl',
        'shadow-xl border-t border-border-subtle lg:border-t-0 lg:border-l',
      ].join(' ')}
    >
      {/* Handle — mobile only */}
      <div className="lg:hidden flex justify-center pt-3 pb-1">
        <div className="h-1 w-10 rounded-full bg-border-subtle" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-fg-primary">Why did Pranix answer this?</h2>
          {meta.gathered_at && (
            <p className="text-[11px] text-fg-disabled mt-0.5">
              <Clock className="inline h-3 w-3 mr-0.5" />{relTime(meta.gathered_at)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-elevated text-fg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* ─ Speculation banner ─ */}
        {meta.speculation_flag && (
          <div className="flex items-start gap-2 rounded-xl border border-severity-warn/30 bg-severity-warn/[0.06] px-3 py-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-severity-warn mt-0.5" />
            <p className="text-[12px] text-severity-warn leading-snug">
              This answer may contain speculation — some information could not be verified against live data.
            </p>
          </div>
        )}

        {/* ─ Model + Confidence ─ */}
        <section>
          <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-semibold mb-2">Response</p>
          <div className="space-y-2">
            <Row icon={Bot} label="Model">
              <span className="text-[13px] text-fg-primary font-medium">{meta.model_used ?? 'Auto'}</span>
            </Row>
            <Row icon={CheckCircle2} label="Confidence">
              <span className={`text-[13px] font-medium ${conf.color}`}>{conf.label}</span>
            </Row>
            {meta.task_id && (
              <Row icon={Hash} label="Task ID">
                <span className="font-mono text-[11px] text-fg-muted">{meta.task_id.slice(0, 12)}…</span>
              </Row>
            )}
            {meta.workspace_id && (
              <Row icon={Layers} label="Workspace">
                <span className="font-mono text-[11px] text-fg-muted">{meta.workspace_id.slice(0, 12)}…</span>
              </Row>
            )}
          </div>
        </section>

        {/* ─ Evidence sources ─ */}
        <section>
          <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-semibold mb-2">Evidence Collected</p>
          {sources.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-canvas px-3 py-3">
              <AlertCircle className="h-4 w-4 text-fg-disabled shrink-0" />
              <p className="text-[12px] text-fg-muted">No external sources were queried — answer came from context alone.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((src) => (
                <div key={src.label} className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-canvas px-3 py-2.5">
                  <src.icon className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-semibold text-fg-primary">{src.label}</span>
                      {src.extra && (
                        <span className="text-[10px] text-fg-disabled">{src.extra}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-fg-muted mt-0.5 leading-snug">{src.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─ What was NOT queried ─ */}
        {sources.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-semibold mb-2">Not Queried</p>
            <div className="flex flex-wrap gap-1.5">
              {([['github', 'GitHub', Github], ['supabase', 'Supabase', Database],
                 ['vercel', 'Vercel', Globe], ['memory', 'Memory', Brain],
                 ['tasks', 'Tasks', ListChecks]] as [string, string, React.ElementType][]).map(([key, label, Icon]) => {
                if (ev[key as keyof EvidenceUsed]) return null
                return (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-fg-disabled">
                    <Icon className="h-3 w-3" />{label}
                  </span>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {panel}
    </>
  )
}

// ── Small row helper ─────────────────────────────────────────────────────────────────
function Row({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-canvas px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
      <span className="text-[12px] text-fg-muted w-20 shrink-0">{label}</span>
      {children}
    </div>
  )
}
