'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Sparkles, ShieldAlert, ArrowUpRight, ExternalLink, User,
  PanelLeftOpen, Bot, Info, Zap, MessageSquare, CheckCircle2, Circle,
  Clock, AlertCircle, ChevronRight, PlayCircle, History, RotateCcw,
  TrendingUp, Shield, Lightbulb, Target, BarChart3,
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

export type TimelineEvent = {
  id:        string
  kind:      'planned' | 'approved' | 'executing' | 'completed' | 'failed'
  label:     string
  timestamp: string
}

export type FounderDecision =
  | 'approve_next_step'
  | 'investigate_further'
  | 'no_action_required'
  | 'blocked_missing_data'

export type TaskAnalysis = {
  executive_summary: string
  findings:          string[]
  risks:             string[]
  recommendations:   string[]
  confidence:        'High' | 'Medium' | 'Low'
  evidence_quality:  'Strong' | 'Partial' | 'Weak'
  founder_decision:  FounderDecision
  analyzed_at:       string
}

export type PersistedTask = {
  task_id:        string
  workspace_id:   string | null
  goal:           string
  execution_mode: ExecutionMode
  status:         'planned' | 'approved' | 'executing' | 'completed' | 'failed'
  plan:           PlanStep[]
  timeline:       TimelineEvent[]
  analysis?:      TaskAnalysis
  updated_at:     string
  persisted_at?:  string
}

export type Reply = {
  kind: 'info' | 'approval_routed' | 'console' | 'help' | 'error'
  title: string
  lines: string[]
  link?: string
  link_label?: string
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
  execution_mode?: ExecutionMode
  plan?:           PlanStep[]
}

type Msg =
  | { role: 'founder'; text: string; model_label: string; agent_mode: boolean }
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
const AGENT_SUGGESTIONS = [
  'Fix Cart2Save affiliate automation',
  'Launch SchoolOS admissions',
  'Debug QuietKeep payment failures',
  'Audit all deployment health',
]
const LS_WS_KEY = 'pranix_active_workspace'

// ── useTimeline ─────────────────────────────────────────────────────────────────
function useTimeline(workspaceId: string | null) {
  const [recentTasks, setRecentTasks] = useState<PersistedTask[]>([])
  const [loaded, setLoaded]           = useState(false)

  useEffect(() => {
    setLoaded(false)
    setRecentTasks([])
    const params = new URLSearchParams()
    if (workspaceId) params.set('workspace_id', workspaceId)
    params.set('limit', '10')
    fetch(`/api/founder/timeline?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tasks) setRecentTasks(data.tasks as PersistedTask[]) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [workspaceId])

  const persistTask = useCallback((snapshot: Omit<PersistedTask, 'persisted_at'>) => {
    fetch('/api/founder/timeline', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(snapshot),
    }).catch(() => {})
    setRecentTasks(prev => [
      snapshot as PersistedTask,
      ...prev.filter(t => t.task_id !== snapshot.task_id),
    ].slice(0, 10))
  }, [])

  return { recentTasks, loaded, persistTask }
}

// ── AskChat ─────────────────────────────────────────────────────────────────
export function AskChat() {
  const [messages, setMessages]               = useState<Msg[]>([])
  const [input, setInput]                     = useState('')
  const [sending, setSending]                 = useState(false)
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null)
  const [lastModelUsed, setLastModelUsed]     = useState<string | null>(null)
  const [agentMode, setAgentMode]             = useState(false)
  const [evidenceOpen, setEvidenceOpen]       = useState(false)
  const [evidenceMeta, setEvidenceMeta]       = useState<EvidenceMeta>({})
  const endRef = useRef<HTMLDivElement>(null)

  const { selectedModel, setSelectedModel } = useModelSelector()
  const { recentTasks, loaded, persistTask } = useTimeline(activeWorkspace)

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

  // Restore a persisted task into the conversation
  function restoreTask(task: PersistedTask) {
    setAgentMode(true)
    setMessages([
      { role: 'founder', text: task.goal, model_label: 'Restored', agent_mode: true },
      {
        role: 'pranix',
        reply: {
          kind:           'info',
          title:          task.goal,
          lines:          [],
          execution_mode: task.execution_mode,
          plan:           task.plan,
          task_id:        task.task_id,
        },
      },
    ])
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

      <WorkspaceSidebar
        activeId={activeWorkspace}
        onSelect={handleSelectWorkspace}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <EvidenceDrawer
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        meta={evidenceMeta}
      />

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

          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate text-[12px] font-medium text-fg-muted">
              {lastModelUsed
                ? <><span className="text-fg-disabled">Using </span><span className="text-accent">{lastModelUsed}</span></>
                : <><span className="text-fg-disabled">Model: </span><span className="text-fg-secondary">{selectedModel.display_name}</span></>}
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-border-subtle bg-canvas p-0.5">
            <button
              onClick={() => setAgentMode(false)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                !agentMode ? 'bg-accent text-canvas shadow-sm' : 'text-fg-muted hover:text-fg-primary'
              }`}
              aria-pressed={!agentMode}
            >
              <MessageSquare className="h-3 w-3" />
              Chat
            </button>
            <button
              onClick={() => setAgentMode(true)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                agentMode ? 'bg-accent text-canvas shadow-sm' : 'text-fg-muted hover:text-fg-primary'
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
                {agentMode ? <Zap className="h-6 w-6 text-accent" /> : <Sparkles className="h-6 w-6 text-accent" />}
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

          {/* Recent Tasks panel — shown only on empty state after data loads */}
          {empty && loaded && recentTasks.length > 0 && (
            <RecentTasksPanel tasks={recentTasks} onRestore={restoreTask} />
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
              <PranixBubble
                key={i}
                reply={m.reply}
                workspaceId={activeWorkspace}
                onOpenEvidence={() => openEvidence(m.reply)}
                persistTask={persistTask}
              />
            )
          )}

          {sending && (
            <div className="flex items-center gap-2 text-[13px] text-fg-muted">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle">
                {agentMode ? <Zap className="h-3.5 w-3.5 text-accent" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
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
              onSelect={(m: ModelOption) => { setSelectedModel(m); setLastModelUsed(null) }}
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

// ── RecentTasksPanel ──────────────────────────────────────────────────────────────
function RecentTasksPanel({ tasks, onRestore }: { tasks: PersistedTask[]; onRestore: (t: PersistedTask) => void }) {
  const statusColor: Record<string, string> = {
    planned:   'text-fg-disabled',
    approved:  'text-accent',
    executing: 'text-accent',
    completed: 'text-accent',
    failed:    'text-severity-critical',
  }
  const statusDot: Record<string, string> = {
    planned:   'bg-fg-disabled',
    approved:  'bg-accent',
    executing: 'bg-accent animate-pulse',
    completed: 'bg-accent',
    failed:    'bg-severity-critical',
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-2 flex items-center gap-1.5">
        <History className="h-3.5 w-3.5 text-fg-muted" />
        <span className="text-[12px] font-medium text-fg-muted">Recent agent tasks</span>
      </div>
      <div className="space-y-1.5">
        {tasks.map(task => (
          <button
            key={task.task_id}
            onClick={() => onRestore(task)}
            className="group flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-elevated"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot[task.status] ?? 'bg-fg-disabled'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg-primary">{task.goal}</p>
              <p className={`mt-0.5 text-[11px] ${statusColor[task.status] ?? 'text-fg-disabled'}`}>
                {task.status} · {task.plan.length} step{task.plan.length === 1 ? '' : 's'}
                {task.timeline.length > 0 && (
                  <> · {task.timeline.length} event{task.timeline.length === 1 ? '' : 's'}</>
                )}
              </p>
              {task.updated_at && (
                <p className="text-[10px] text-fg-disabled">
                  {new Date(task.updated_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-fg-disabled opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PranixBubble ──────────────────────────────────────────────────────────────
function PranixBubble({
  reply, workspaceId, onOpenEvidence, persistTask,
}: {
  reply: Reply
  workspaceId: string | null
  onOpenEvidence: () => void
  persistTask: (s: Omit<PersistedTask, 'persisted_at'>) => void
}) {
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

        {!isPlan && (
          <div className="space-y-0.5">
            {reply.lines.map((l, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-fg-secondary">{l}</p>
            ))}
          </div>
        )}

        {isPlan && reply.plan && reply.task_id && (
          <PlanView
            plan={reply.plan}
            goal={reply.title}
            taskId={reply.task_id}
            workspaceId={workspaceId}
            persistTask={persistTask}
          />
        )}
        {isPlan && reply.plan && !reply.task_id && (
          <PlanView
            plan={reply.plan}
            goal={reply.title}
            taskId={crypto.randomUUID()}
            workspaceId={workspaceId}
            persistTask={persistTask}
          />
        )}

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
type ExecPhase = 'idle' | 'executing' | 'completed' | 'failed'

type RichPlanStep = PlanStep & {
  result_summary?: string
  raw_result?:     unknown
  started_at?:     string
  completed_at?:   string
}

function PlanView({
  plan, goal, taskId, workspaceId, persistTask,
}: {
  plan:        PlanStep[]
  goal:        string
  taskId:      string
  workspaceId: string | null
  persistTask: (s: Omit<PersistedTask, 'persisted_at'>) => void
}) {
  const [phase, setPhase]       = useState<ExecPhase>('idle')
  const [steps, setSteps]       = useState<RichPlanStep[]>(plan.map(s => ({ ...s, status: 'planned' })))
  const [timeline, setTimeline] = useState<TimelineEvent[]>([{
    id:        'plan-created',
    kind:      'planned',
    label:     `Plan created — ${plan.length} step${plan.length === 1 ? '' : 's'}`,
    timestamp: new Date().toISOString(),
  }])
  const [analysis, setAnalysis]           = useState<TaskAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const analysisPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const persist = useCallback((overridePhase?: ExecPhase, overrideSteps?: RichPlanStep[], overrideTimeline?: TimelineEvent[]) => {
    const s  = overrideSteps    ?? steps
    const t  = overrideTimeline ?? timeline
    const ph = overridePhase    ?? phase
    persistTask({
      task_id:        taskId,
      workspace_id:   workspaceId,
      goal,
      execution_mode: (ph === 'completed' || ph === 'failed') ? 'completed' : ph === 'executing' ? 'executing' : 'plan',
      status:         ph === 'failed' ? 'failed' : ph === 'completed' ? 'completed' : ph === 'executing' ? 'executing' : 'planned',
      plan:           s as PlanStep[],
      timeline:       t,
      updated_at:     new Date().toISOString(),
    })
  }, [taskId, workspaceId, goal, phase, steps, timeline, persistTask])

  useEffect(() => { persist('idle', steps, timeline) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (analysisPollRef.current) clearInterval(analysisPollRef.current)
  }, [])

  // Fetch analysis from execution_memory (included in timeline API response)
  async function fetchAnalysis(): Promise<TaskAnalysis | null> {
    try {
      const res  = await fetch(`/api/founder/timeline?limit=20`)
      if (!res.ok) return null
      const data = await res.json()
      const task = (data?.tasks as (PersistedTask & { analysis?: TaskAnalysis })[] | undefined)
        ?.find(t => t.task_id === taskId)
      return task?.analysis ?? null
    } catch { return null }
  }

  // Poll until analysis appears in execution_memory (analyze API runs ~1-2s after execute)
  function startAnalysisPoll() {
    if (analysisPollRef.current) return
    setAnalysisLoading(true)
    analysisPollRef.current = setInterval(async () => {
      const a = await fetchAnalysis()
      if (a) {
        setAnalysis(a)
        setAnalysisLoading(false)
        clearInterval(analysisPollRef.current!)
        analysisPollRef.current = null
      }
    }, 2500)
    // Stop polling after 60s regardless (analysis may have been skipped)
    setTimeout(() => {
      if (analysisPollRef.current) {
        clearInterval(analysisPollRef.current)
        analysisPollRef.current = null
        setAnalysisLoading(false)
      }
    }, 60_000)
  }

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/founder/timeline?limit=20`)
        if (!res.ok) return
        const data = await res.json()
        const task = (data?.tasks as PersistedTask[] | undefined)?.find(t => t.task_id === taskId)
        if (!task) return
        setSteps(task.plan as RichPlanStep[])
        setTimeline(task.timeline)
        const s = task.status
        if (s === 'completed' || s === 'failed') {
          setPhase(s)
          clearInterval(pollRef.current!)
          pollRef.current = null
          const richTask = task as PersistedTask & { analysis?: TaskAnalysis }
          // Restore analysis immediately if it's already there
          if (richTask.analysis) {
            setAnalysis(richTask.analysis)
            setAnalysisLoading(false)
          } else {
            // Otherwise start polling for it (analyze API runs shortly after execute)
            startAnalysisPoll()
          }
          persistTask({
            task_id: task.task_id, workspace_id: task.workspace_id,
            goal: task.goal, execution_mode: task.execution_mode,
            status: task.status, plan: task.plan,
            timeline: task.timeline, updated_at: task.updated_at,
          })
        } else if (s === 'executing') {
          setPhase('executing')
        }
      } catch { /* silent */ }
    }, 2000)
  }

  async function approvePlan() {
    const approvedTimeline: TimelineEvent[] = [
      ...timeline,
      { id: 'plan-approved', kind: 'approved', label: 'Plan approved by founder', timestamp: new Date().toISOString() },
    ]
    const approvedSteps = steps.map(s => ({ ...s, status: 'approved' as const }))
    setSteps(approvedSteps)
    setTimeline(approvedTimeline)
    setPhase('executing')
    persist('executing', approvedSteps, approvedTimeline)
    try {
      await fetch('/api/founder/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, workspace_id: workspaceId, plan: approvedSteps }),
      })
    } catch { /* server-side; polling picks up state */ }
    startPolling()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Zap className="h-3 w-3 text-accent" />
        <span>Agent plan for: <em className="text-fg-secondary not-italic">{goal.slice(0, 60)}</em></span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step) => (
          <StepRow key={step.step_number} step={step} active={step.status === 'executing'} />
        ))}
      </div>

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
          <CheckCircle2 className="h-4 w-4" /> Execution complete — {steps.filter(s => s.status === 'completed').length}/{steps.length} steps finished.
        </div>
      )}
      {phase === 'failed' && (
        <div className="flex items-center gap-2 rounded-xl border border-severity-critical/20 bg-severity-critical/[0.05] px-3 py-2 text-[13px] font-medium text-severity-critical">
          <AlertCircle className="h-4 w-4" /> Execution stopped — {steps.filter(s => s.status === 'completed').length}/{steps.length} steps completed before failure.
        </div>
      )}

      {/* Analysis section — appears after execution completes */}
      {(phase === 'completed' || phase === 'failed') && (
        analysisLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-elevated px-3 py-2.5 text-[12px] text-fg-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            Analyzing evidence…
          </div>
        ) : analysis ? (
          <AnalysisView analysis={analysis} />
        ) : null
      )}

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
function StepRow({ step, active }: { step: RichPlanStep; active: boolean }) {
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
      <div className="min-w-0 flex-1">
        <p className={`font-medium leading-snug ${
          step.status === 'completed' ? 'text-fg-secondary' :
          step.status === 'failed'    ? 'text-severity-critical' :
          step.status === 'executing' ? 'text-accent' :
          'text-fg-primary'
        }`}>
          {step.step_number}. {step.title}
        </p>
        {step.result_summary && (
          <p className="mt-1 rounded-md bg-elevated px-2 py-1 text-[11px] text-fg-secondary leading-relaxed">
            {step.result_summary}
          </p>
        )}
        {!step.result_summary && step.description && (
          <p className="mt-0.5 text-[11px] text-fg-disabled leading-relaxed">{step.description}</p>
        )}
        {step.tool && !step.result_summary && (
          <span className="mt-0.5 inline-block rounded bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
            {step.tool}
          </span>
        )}
        {step.tool && step.result_summary && (
          <span className="mt-1 inline-block rounded bg-canvas px-1.5 py-0.5 text-[10px] font-mono text-fg-disabled">
            {step.tool}
          </span>
        )}
      </div>
    </div>
  )
}

// ── TimelineIcon ──────────────────────────────────────────────────────────────
function AnalysisView({ analysis }: { analysis: TaskAnalysis }) {
  const decisionConfig: Record<string, { label: string; color: string; bg: string }> = {
    approve_next_step:    { label: 'Approve Next Step',      color: 'text-accent',              bg: 'bg-accent/[0.07] border-accent/20' },
    investigate_further:  { label: 'Investigate Further',    color: 'text-severity-warn',       bg: 'bg-severity-warn/[0.06] border-severity-warn/20' },
    no_action_required:   { label: 'No Action Required',     color: 'text-fg-secondary',        bg: 'bg-elevated border-border-subtle' },
    blocked_missing_data: { label: 'Blocked — Missing Data', color: 'text-severity-critical',   bg: 'bg-severity-critical/[0.05] border-severity-critical/20' },
  }
  const confidenceColor: Record<string, string> = {
    High:   'text-accent bg-accent/[0.08] border-accent/20',
    Medium: 'text-severity-warn bg-severity-warn/[0.08] border-severity-warn/20',
    Low:    'text-severity-critical bg-severity-critical/[0.08] border-severity-critical/20',
  }
  const dc = decisionConfig[analysis.founder_decision] ?? decisionConfig.investigate_further
  const cc = confidenceColor[analysis.confidence] ?? confidenceColor.Medium

  return (
    <div className="mt-1 space-y-3 rounded-xl border border-border-subtle bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12px] font-semibold text-fg-primary">AI Analysis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cc}`}>
            {analysis.confidence} confidence
          </span>
          <span className="text-[10px] text-fg-disabled">{analysis.evidence_quality} evidence</span>
        </div>
      </div>

      <div className="rounded-lg bg-elevated px-3 py-2">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-disabled">Executive Summary</p>
        <p className="text-[12px] leading-relaxed text-fg-secondary">{analysis.executive_summary}</p>
      </div>

      {analysis.findings.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-fg-primary">
            <TrendingUp className="h-3 w-3 text-accent" /> Findings
          </div>
          <ul className="space-y-1">
            {analysis.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-fg-secondary leading-relaxed">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.risks.filter(r => !r.startsWith('No critical')).length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-fg-primary">
            <Shield className="h-3 w-3 text-severity-warn" /> Risks
          </div>
          <ul className="space-y-1">
            {analysis.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-severity-warn leading-relaxed">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-severity-warn" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-fg-primary">
            <Lightbulb className="h-3 w-3 text-accent" /> Recommendations
          </div>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-fg-secondary leading-relaxed">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fg-muted" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${dc.bg}`}>
        <Target className={`h-3.5 w-3.5 shrink-0 ${dc.color}`} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-disabled">Founder Decision</p>
          <p className={`text-[12px] font-semibold ${dc.color}`}>{dc.label}</p>
        </div>
      </div>
    </div>
  )
}

function TimelineIcon({ kind }: { kind: TimelineEvent['kind'] }) {
  const cls = 'h-3 w-3 shrink-0 mt-0.5'
  if (kind === 'planned')   return <Clock        className={`${cls} text-fg-disabled`} />
  if (kind === 'approved')  return <CheckCircle2 className={`${cls} text-accent`} />
  if (kind === 'executing') return <Loader2      className={`${cls} text-accent animate-spin`} />
  if (kind === 'completed') return <CheckCircle2 className={`${cls} text-accent`} />
  return                           <AlertCircle  className={`${cls} text-severity-critical`} />
}
