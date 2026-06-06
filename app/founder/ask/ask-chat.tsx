'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Sparkles, ShieldAlert, ArrowUpRight, ExternalLink, User,
  PanelLeftOpen, Bot, Info, Zap, MessageSquare, CheckCircle2, Circle,
  Clock, AlertCircle, ChevronRight, PlayCircle,
} from 'lucide-react'
import { WorkspaceSidebar } from './_components/WorkspaceSidebar'
import { ModelSelector, useModelSelector, type ModelOption } from './_components/ModelSelector'
import { EvidenceDrawer, type EvidenceMeta } from './_components/EvidenceDrawer'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ExecutionMode = 'chat' | 'plan' | 'approval_required' | 'executing' | 'completed'

export type PlanStep = {
  step_number: number
  title:       string
  description: string
  tool?:       string
  status:      'planned' | 'approved' | 'executing' | 'completed' | 'failed'
}

export type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error'
  title: string
  lines: string[]
  link?: string
  link_label?: string
  // ─ Model & Evidence fields ─
  model_used?:       string
  confidence?:       number
  task_id?:          string
  workspace_id?:     string
  gathered_at?:      string
  speculation_flag?: boolean
  evidence_used?: {
    github?:   { summary: string; files_checked?: number; commits_checked?: number }
    supabase?: { summary: string; tables_queried?: number; rows_read?: number }
    vercel?:   { summary: string; deployments_checked?: number }
    memory?:   { count: number; summary?: string }
    tasks?:    { count: number; summary?: string }
  }
  // ─ Agent Mode fields ─
  execution_mode?: ExecutionMode
  plan?:           PlanStep[]
}

type Msg =
  | { role: 'founder'; text: string; model_label: string; agent_mode: boolean }
  | { role: 'pranix';  reply: Reply }

// ── Timeline event shape (client-only, no DB) ─────────────────────────────────
type TimelineEvent = {
  id:        string
  kind:      'planned' | 'approved' | 'executing' | 'completed' | 'failed'
  label:     string
  timestamp: string
}

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
const AGENT_SUGGESTIONS = [
  'Fix Cart2Save affiliate automation',
  'Launch SchoolOS admissions',
  'Debug QuietKeep payment failures',
  'Audit all deployment health',
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
  const [agentMode, setAgentMode]             = useState(false)
  // Evidence drawer state
  const [evidenceOpen, setEvidenceOpen]       = useState(false)
  const [evidenceMeta, setEvidenceMeta]       = useState<EvidenceMeta>({})
  const endRef = useRef<HTMLDivElement>(null)

  const { selectedModel, setSelectedModel } = useModelSelector()

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
      role:        'founder',
      text:        msg,
      model_label: selectedModel.display_name,
      agent_mode:  agentMode,
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
          agent_mode:    agentMode,
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
  const suggestions = agentMode ? AGENT_SUGGESTIONS : SUGGESTIONS

  return (
    <div className="flex h-[calc(100dvh-7rem)] w-full overflow-hidden lg:h-[calc(100dvh-3.5rem)]">

      {/* Workspace sidebar */}
      <WorkspaceSidebar
        activeId={activeWorkspace}
        onSelect={handleSelectWorkspace}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Evidence Drawer */}
      <EvidenceDrawer
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        meta={evidenceMeta}
      />

      {/* Chat column */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface px-3 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors"
            aria-label="Open workspaces"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>

          {/* Model label */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate text-[12px] font-medium text-fg-muted">
              {lastModelUsed
                ? <><span className="text-fg-disabled">Using </span><span className="text-accent">{lastModelUsed}</span></>
                : <><span className="text-fg-disabled">Model: </span><span className="text-fg-secondary">{selectedModel.display_name}</span></>}
            </span>
          </div>

          {/* ── Mode Toggle ── */}
          <div className="flex items-center rounded-lg border border-border-subtle bg-canvas p-0.5">
            <button
              onClick={() => setAgentMode(false)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                !agentMode
                  ? 'bg-accent text-canvas shadow-sm'
                  : 'text-fg-muted hover:text-fg-primary'
              }`}
              aria-pressed={!agentMode}
            >
              <MessageSquare className="h-3 w-3" />
              Chat
            </button>
            <button
              onClick={() => setAgentMode(true)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                agentMode
                  ? 'bg-accent text-canvas shadow-sm'
                  : 'text-fg-muted hover:text-fg-primary'
              }`}
              aria-pressed={agentMode}
            >
              <Zap className="h-3 w-3" />
              Agent
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-3 space-y-4">
          {empty && (
            <div className="flex flex-col items-center justify-center pt-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle">
                {agentMode
                  ? <Zap className="h-6 w-6 text-accent" />
                  : <Sparkles className="h-6 w-6 text-accent" />}
              </span>
              <h1 className="mt-3 text-lg font-semibold text-fg-primary">
                {agentMode ? 'Agent Mode' : 'Ask Pranix'}
              </h1>
              <p className="mt-1 max-w-sm text-[13px] text-fg-muted">
                {agentMode
                  ? 'Describe work to be done. Pranix will create a step-by-step plan for your approval before anything runs.'
                  : 'Ask about your system in plain words. I read your live data and route anything risky to your Permission Center first.'}
              </p>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'founder' ? (
              <div key={i} className="flex justify-end">
                <div className="flex items-end gap-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-fg-disabled px-1 flex items-center gap-1">
                      {m.agent_mode && <Zap className="h-2.5 w-2.5 text-accent" />}
                      {m.model_label}
                    </span>
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
                {agentMode
                  ? <Zap className="h-3.5 w-3.5 text-accent" />
                  : <Sparkles className="h-3.5 w-3.5 text-accent" />}
              </span>
              <Loader2 className="h-4 w-4 animate-spin" />
              {agentMode ? 'Planning…' : 'Thinking…'}
            </div>
          )}

          {empty && (
            <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
              {suggestions.map((s) => (
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
              placeholder={agentMode ? 'Describe work for Pranix to plan…' : 'Ask Pranix anything…'}
              className="max-h-32 flex-1 resize-none bg-transparent text-[14px] text-fg-primary placeholder:text-fg-disabled focus:outline-none"
            />
            <button onClick={() => send(input)} disabled={sending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-canvas transition-opacity disabled:opacity-40"
              aria-label="Send">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[10px] text-fg-disabled">
            {agentMode
              ? 'Agent Mode: Pranix plans first. Nothing runs without your approval.'
              : 'Pranix reads live data and never changes anything without your approval.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── PranixBubble ──────────────────────────────────────────────────────────────
function PranixBubble({ reply, onOpenEvidence }: { reply: Reply; onOpenEvidence: () => void }) {
  const isPlan     = reply.execution_mode === 'plan' && Array.isArray(reply.plan) && reply.plan.length > 0
  const accent =
    reply.kind === 'approval_routed' ? 'border-severity-warn/30 bg-severity-warn/[0.04]'
    : reply.kind === 'error'         ? 'border-severity-critical/30 bg-severity-critical/[0.04]'
    : isPlan                         ? 'border-accent/20 bg-accent/[0.03]'
    : 'border-border-subtle bg-surface'
  const isExternal = reply.link?.startsWith('http')

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        {reply.kind === 'approval_routed'
          ? <ShieldAlert className="h-3.5 w-3.5 text-severity-warn" />
          : isPlan
            ? <Zap className="h-3.5 w-3.5 text-accent" />
            : <Sparkles className="h-3.5 w-3.5 text-accent" />}
      </span>

      <div className={`w-full max-w-[92%] space-y-2 rounded-2xl rounded-tl-md border px-3.5 py-2.5 ${accent}`}>
        <p className="text-[14px] font-semibold text-fg-primary">{reply.title}</p>

        {/* Chat mode: plain lines */}
        {!isPlan && (
          <div className="space-y-0.5">
            {reply.lines.map((l, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-fg-secondary">{l}</p>
            ))}
          </div>
        )}

        {/* Agent Mode: plan view */}
        {isPlan && reply.plan && (
          <PlanView plan={reply.plan} goal={reply.title} />
        )}

        {/* model_used + Why? */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {reply.model_used && (
            <span className="inline-flex items-center gap-1 text-[11px] text-fg-disabled">
              <Bot className="h-3 w-3" /> {reply.model_used}
            </span>
          )}
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

// ── PlanView ──────────────────────────────────────────────────────────────────
type ExecPhase = 'idle' | 'executing' | 'completed'

function PlanView({ plan, goal }: { plan: PlanStep[]; goal: string }) {
  const [phase, setPhase]         = useState<ExecPhase>('idle')
  const [activeStep, setActive]   = useState(-1)
  const [steps, setSteps]         = useState<PlanStep[]>(plan.map(s => ({ ...s, status: 'planned' })))
  const [timeline, setTimeline]   = useState<TimelineEvent[]>([{
    id:        'plan-created',
    kind:      'planned',
    label:     `Plan created — ${plan.length} step${plan.length === 1 ? '' : 's'}`,
    timestamp: new Date().toISOString(),
  }])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark all steps approved then simulate read-only execution
  function approvePlan() {
    setSteps(s => s.map(step => ({ ...step, status: 'approved' })))
    setTimeline(t => [...t, {
      id:        'plan-approved',
      kind:      'approved',
      label:     'Plan approved by founder',
      timestamp: new Date().toISOString(),
    }])
    setPhase('executing')
    runStep(0)
  }

  function runStep(idx: number) {
    if (idx >= steps.length) {
      setPhase('completed')
      setTimeline(t => [...t, {
        id:        'plan-completed',
        kind:      'completed',
        label:     `All ${steps.length} steps completed (read-only)`,
        timestamp: new Date().toISOString(),
      }])
      return
    }
    setActive(idx)
    setSteps(s => s.map((step, i) =>
      i === idx ? { ...step, status: 'executing' } : step
    ))
    setTimeline(t => [...t, {
      id:        `step-${idx}-executing`,
      kind:      'executing',
      label:     `Step ${idx + 1}: ${steps[idx].title}`,
      timestamp: new Date().toISOString(),
    }])
    // Simulate read-only execution delay (1.2 – 2s per step)
    timerRef.current = setTimeout(() => {
      setSteps(s => s.map((step, i) =>
        i === idx ? { ...step, status: 'completed' } : step
      ))
      setTimeline(t => [...t, {
        id:        `step-${idx}-done`,
        kind:      'completed',
        label:     `Step ${idx + 1} completed`,
        timestamp: new Date().toISOString(),
      }])
      runStep(idx + 1)
    }, 1200 + Math.random() * 800)
  }

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="space-y-3">
      {/* Goal header */}
      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Zap className="h-3 w-3 text-accent" />
        <span>Agent plan for: <em className="text-fg-secondary not-italic">{goal.slice(0, 60)}</em></span>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <StepRow key={step.step_number} step={step} active={i === activeStep && phase === 'executing'} />
        ))}
      </div>

      {/* Approve / progress bar */}
      {phase === 'idle' && (
        <button
          onClick={approvePlan}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/20 active:scale-[0.98]"
        >
          <PlayCircle className="h-4 w-4" />
          Approve Plan &amp; Execute
        </button>
      )}

      {phase === 'executing' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-fg-muted">
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Executing (read-only)</span>
            <span>{steps.filter(s => s.status === 'completed').length} / {steps.length}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[13px] font-medium text-accent">
          <CheckCircle2 className="h-4 w-4" /> All steps completed — read-only run finished.
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <details className="group" open={phase !== 'idle'}>
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-fg-disabled hover:text-fg-muted">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            Execution timeline ({timeline.length})
          </summary>
          <div className="mt-1.5 space-y-1 border-l-2 border-border-subtle pl-3">
            {timeline.map((ev) => (
              <div key={ev.id} className="flex items-start gap-1.5">
                <TimelineIcon kind={ev.kind} />
                <div>
                  <p className="text-[11px] text-fg-secondary leading-tight">{ev.label}</p>
                  <p className="text-[10px] text-fg-disabled">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── StepRow ───────────────────────────────────────────────────────────────────
function StepRow({ step, active }: { step: PlanStep; active: boolean }) {
  const statusIcon = {
    planned:   <Circle       className="h-3.5 w-3.5 text-fg-disabled" />,
    approved:  <Circle       className="h-3.5 w-3.5 text-accent" />,
    executing: <Loader2      className="h-3.5 w-3.5 text-accent animate-spin" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 text-accent" />,
    failed:    <AlertCircle  className="h-3.5 w-3.5 text-severity-critical" />,
  }[step.status]

  return (
    <div className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px] transition-colors ${
      active ? 'bg-accent/[0.07] border border-accent/20' : 'hover:bg-elevated'
    }`}>
      <span className="mt-0.5 shrink-0">{statusIcon}</span>
      <div className="min-w-0">
        <p className={`font-medium leading-snug ${
          step.status === 'completed' ? 'text-fg-muted line-through' :
          step.status === 'executing' ? 'text-accent' :
          'text-fg-primary'
        }`}>
          {step.step_number}. {step.title}
        </p>
        {step.description && (
          <p className="mt-0.5 text-[11px] text-fg-disabled leading-relaxed">{step.description}</p>
        )}
        {step.tool && (
          <span className="mt-0.5 inline-block rounded bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
            {step.tool}
          </span>
        )}
      </div>
    </div>
  )
}

// ── TimelineIcon ──────────────────────────────────────────────────────────────
function TimelineIcon({ kind }: { kind: TimelineEvent['kind'] }) {
  const cls = 'h-3 w-3 shrink-0 mt-0.5'
  if (kind === 'planned')   return <Clock        className={`${cls} text-fg-disabled`} />
  if (kind === 'approved')  return <CheckCircle2 className={`${cls} text-accent`} />
  if (kind === 'executing') return <Loader2      className={`${cls} text-accent animate-spin`} />
  if (kind === 'completed') return <CheckCircle2 className={`${cls} text-accent`} />
  return                           <AlertCircle  className={`${cls} text-severity-critical`} />
}
