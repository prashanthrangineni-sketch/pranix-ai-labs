'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Sparkles, ShieldAlert, ArrowUpRight, ExternalLink, User,
  PanelLeftOpen, Bot, Info,
} from 'lucide-react'
import { WorkspaceSidebar } from './_components/WorkspaceSidebar'
import { ModelSelector, useModelSelector, type ModelOption } from './_components/ModelSelector'
import { EvidenceDrawer, type EvidenceMeta } from './_components/EvidenceDrawer'

// ── Types ─────────────────────────────────────────────────────────────────────
export type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error'
  title: string
  lines: string[]
  link?: string
  link_label?: string
  // ─ Model & Evidence fields attached by route.ts ─
  model_used?:       string
  confidence?:       number           // 0–1 float
  task_id?:          string
  workspace_id?:     string
  gathered_at?:      string           // ISO timestamp
  speculation_flag?: boolean
  evidence_used?: {
    github?:   { summary: string; files_checked?: number; commits_checked?: number }
    supabase?: { summary: string; tables_queried?: number; rows_read?: number }
    vercel?:   { summary: string; deployments_checked?: number }
    memory?:   { count: number; summary?: string }
    tasks?:    { count: number; summary?: string }
  }
}
type Msg =
  | { role: 'founder'; text: string; model_label: string }
  | { role: 'pranix';  reply: Reply }

// ── Constants ─────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What failed today?',
  'Show pending approvals.',
  'Check provider health.',
  'Show alerts.',
  'Check agent status.',
  'Show deployment health.',
  'Review Cart2Save.',
  'Open Supabase.',
]
const LS_WS_KEY = 'pranix_active_workspace'

// ── AskChat ───────────────────────────────────────────────────────────────────
export function AskChat() {
  const [messages, setMessages]               = useState<Msg[]>([])
  const [input, setInput]                     = useState('')
  const [sending, setSending]                 = useState(false)
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null)
  const [lastModelUsed, setLastModelUsed]     = useState<string | null>(null)
  // Evidence drawer state
  const [evidenceOpen, setEvidenceOpen]       = useState(false)
  const [evidenceMeta, setEvidenceMeta]       = useState<EvidenceMeta>({})
  const endRef = useRef<HTMLDivElement>(null)

  const { selectedModel, setSelectedModel } = useModelSelector()

  // Restore workspace from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_WS_KEY)
      if (stored) setActiveWorkspace(stored)
    } catch { }
  }, [])

  const handleSelectWorkspace = useCallback((id: string) => {
    setActiveWorkspace(id)
    setMessages([])
    setLastModelUsed(null)
    try { localStorage.setItem(LS_WS_KEY, id) } catch { }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function openEvidence(reply: Reply) {
    setEvidenceMeta({
      model_used:       reply.model_used,
      confidence:       reply.confidence,
      task_id:          reply.task_id,
      workspace_id:     reply.workspace_id,
      gathered_at:      reply.gathered_at,
      speculation_flag: reply.speculation_flag,
      evidence_used:    reply.evidence_used,
    })
    setEvidenceOpen(true)
  }

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || sending) return
    setInput('')
    setMessages((m) => [...m, {
      role: 'founder',
      text: msg,
      model_label: selectedModel.display_name,
    }])
    setSending(true)
    try {
      const res = await fetch('/api/founder/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:       msg,
          workspace_id:  activeWorkspace ?? undefined,
          model:         selectedModel.engine_model_id,
          model_display: selectedModel.display_name,
          provider:      selectedModel.provider,
        }),
      })
      const data = await res.json()
      const reply: Reply = data?.reply ?? {
        kind: 'error', title: 'No response', lines: ['Please try again.'],
      }
      if (reply.model_used) setLastModelUsed(reply.model_used)
      setMessages((m) => [...m, { role: 'pranix', reply }])
    } catch {
      setMessages((m) => [...m, {
        role: 'pranix',
        reply: { kind: 'error', title: 'Connection problem', lines: ['I could not reach the server. Please try again.'] },
      }])
    } finally {
      setSending(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex h-[calc(100dvh-7rem)] w-full overflow-hidden lg:h-[calc(100dvh-3.5rem)]">

      {/* Workspace sidebar */}
      <WorkspaceSidebar
        activeId={activeWorkspace}
        onSelect={handleSelectWorkspace}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Evidence Drawer — portal-like, sits above everything */}
      <EvidenceDrawer
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        meta={evidenceMeta}
      />

      {/* Chat column */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Chat topbar */}
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface px-3 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors"
            aria-label="Open workspaces"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate text-[12px] font-medium text-fg-muted">
              {lastModelUsed
                ? <><span className="text-fg-disabled">Using </span><span className="text-accent">{lastModelUsed}</span></>
                : <><span className="text-fg-disabled">Model: </span><span className="text-fg-secondary">{selectedModel.display_name}</span></>}
            </span>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-3 space-y-4">
          {empty && (
            <div className="flex flex-col items-center justify-center pt-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle">
                <Sparkles className="h-6 w-6 text-accent" />
              </span>
              <h1 className="mt-3 text-lg font-semibold text-fg-primary">Ask Pranix</h1>
              <p className="mt-1 max-w-sm text-[13px] text-fg-muted">
                Ask about your system in plain words. I read your live data and route anything risky to your Permission Center first.
              </p>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'founder' ? (
              <div key={i} className="flex justify-end">
                <div className="flex items-end gap-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-fg-disabled px-1">{m.model_label}</span>
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[14px] text-canvas">
                      {m.text}
                    </div>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated mb-5">
                    <User className="h-3.5 w-3.5 text-fg-muted" />
                  </span>
                </div>
              </div>
            ) : (
              <PranixBubble key={i} reply={m.reply} onOpenEvidence={() => openEvidence(m.reply)} />
            )
          )}

          {sending && (
            <div className="flex items-center gap-2 text-[13px] text-fg-muted">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </span>
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          )}

          {empty && (
            <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-left text-[13px] text-fg-secondary transition-colors hover:border-accent/40 hover:bg-elevated">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border-subtle bg-surface px-3 py-3 safe-bottom">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] text-fg-disabled">Model</span>
            <ModelSelector
              selectedModel={selectedModel}
              onSelect={(m: ModelOption) => {
                setSelectedModel(m)
                setLastModelUsed(null)
              }}
            />
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-canvas px-3 py-2 focus-within:border-accent/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              rows={1}
              placeholder="Ask Pranix anything…"
              className="max-h-32 flex-1 resize-none bg-transparent text-[14px] text-fg-primary placeholder:text-fg-disabled focus:outline-none"
            />
            <button onClick={() => send(input)} disabled={sending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-canvas transition-opacity disabled:opacity-40"
              aria-label="Send">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[10px] text-fg-disabled">
            Pranix reads live data and never changes anything without your approval.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── PranixBubble ────────────────────────────────────────────────────────────────
function PranixBubble({ reply, onOpenEvidence }: { reply: Reply; onOpenEvidence: () => void }) {
  const accent =
    reply.kind === 'approval_routed' ? 'border-severity-warn/30 bg-severity-warn/[0.04]'
    : reply.kind === 'error'         ? 'border-severity-critical/30 bg-severity-critical/[0.04]'
    : 'border-border-subtle bg-surface'
  const isExternal = reply.link?.startsWith('http')

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        {reply.kind === 'approval_routed'
          ? <ShieldAlert className="h-3.5 w-3.5 text-severity-warn" />
          : <Sparkles    className="h-3.5 w-3.5 text-accent" />}
      </span>

      <div className={`max-w-[85%] space-y-2 rounded-2xl rounded-tl-md border px-3.5 py-2.5 ${accent}`}>
        <p className="text-[14px] font-semibold text-fg-primary">{reply.title}</p>
        <div className="space-y-0.5">
          {reply.lines.map((l, i) => (
            <p key={i} className="text-[13px] leading-relaxed text-fg-secondary">{l}</p>
          ))}
        </div>

        {/* model_used + Why? button row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {reply.model_used && (
            <span className="inline-flex items-center gap-1 text-[11px] text-fg-disabled">
              <Bot className="h-3 w-3" /> {reply.model_used}
            </span>
          )}
          {/* Why? button — always visible on every Pranix answer */}
          <button
            onClick={onOpenEvidence}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border-subtle bg-canvas px-2.5 py-1 text-[11px] font-medium text-fg-muted hover:border-accent/40 hover:bg-elevated hover:text-accent transition-colors"
            aria-label="Why did Pranix answer this?"
          >
            <Info className="h-3 w-3" />
            Why did Pranix answer this?
          </button>
        </div>

        {reply.link && reply.link_label && (
          <a href={reply.link}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-accent hover:bg-elevated">
            {reply.link_label}
            {isExternal ? <ExternalLink className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          </a>
        )}
      </div>
    </div>
  )
}
