import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTaskById, type TaskDetail } from '@/lib/queries'
import {
  ChevronLeft, Skull, CheckCircle2, XCircle,
  AlertTriangle, Clock, ExternalLink,
} from 'lucide-react'

export const revalidate = 30

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  return { title: `Task ${params.id.slice(0, 8)}` }
}

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const task = await getTaskById(params.id)
  if (!task) notFound()

  const isDead = task.state === 'dead'
  const isCompleted = task.state === 'completed'
  const isCancelled = task.state === 'cancelled'
  const attemptsMaxed =
    task.max_attempts !== null && task.attempts >= task.max_attempts

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Back nav */}
      <Link
        href="/founder/tasks"
        className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg-primary transition-colors duration-fast"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Task queue
      </Link>

      {/* Dead task banner */}
      {isDead && (
        <div className="rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-4 py-3 flex items-center gap-2">
          <Skull className="h-4 w-4 text-severity-critical shrink-0" />
          <span className="text-xs text-severity-critical font-medium">
            This task exhausted all attempts. See last error below.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-sm font-mono font-semibold text-fg-primary break-all">
            {task.action}
          </h1>
          <StateBadge state={task.state} />
        </div>
        <p className="text-[10px] font-mono text-fg-disabled">{task.id}</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Tier" value={task.tier !== null ? String(task.tier) : '—'} />
        <StatCard label="Priority" value={task.priority !== null ? String(task.priority) : '—'} />
        <StatCard
          label="Attempts"
          value={`${task.attempts}${task.max_attempts !== null ? `/${task.max_attempts}` : ''}`}
          alert={attemptsMaxed}
        />
        <StatCard
          label="Locked by"
          value={task.locked_by ? task.locked_by.slice(0, 8) : '—'}
          mono
        />
      </div>

      {/* Timestamps */}
      <Section title="Timestamps">
        <div className="grid grid-cols-1 gap-1">
          <TimeRow label="Created" iso={task.created_at} />
          <TimeRow label="Available" iso={task.available_at} />
          <TimeRow label="Started" iso={task.started_at} />
          <TimeRow label="Locked at" iso={task.locked_at} />
          <TimeRow label="Completed" iso={task.completed_at} />
        </div>
      </Section>

      {/* Last error */}
      {task.last_error && (
        <Section title="Last Error">
          <pre className="text-[11px] font-mono text-severity-error whitespace-pre-wrap break-all leading-relaxed">
            {task.last_error}
          </pre>
        </Section>
      )}

      {/* Parent job */}
      {task.parent_job_id && (
        <Section title="Parent Job">
          <Link
            href={`/founder/tasks/${task.parent_job_id}`}
            className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
          >
            {task.parent_job_id}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Section>
      )}

      {/* Depends on */}
      {task.depends_on && task.depends_on.length > 0 && (
        <Section title={`Dependencies (${task.depends_on.length})`}>
          <div className="space-y-1">
            {task.depends_on.map((depId) => (
              <Link
                key={depId}
                href={`/founder/tasks/${depId}`}
                className="flex items-center gap-1 text-xs font-mono text-accent hover:underline"
              >
                {depId}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Artifacts */}
      {task.artifacts && (
        <Section title="Artifacts">
          <JsonBlock data={task.artifacts} />
        </Section>
      )}

      {/* Result */}
      {task.result && (
        <Section title="Result">
          <JsonBlock data={task.result} />
        </Section>
      )}

      {/* Input */}
      {task.input && (
        <details className="rounded-lg border border-border-subtle bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-fg-secondary select-none">
            Input payload
          </summary>
          <div className="border-t border-border-subtle px-4 py-3">
            <JsonBlock data={task.input} />
          </div>
        </details>
      )}

      {/* Idempotency key */}
      {task.idempotency_key && (
        <Section title="Idempotency Key">
          <span className="text-xs font-mono text-fg-muted">{task.idempotency_key}</span>
        </Section>
      )}

      <div className="flex items-center gap-1 text-xs text-fg-disabled pt-2">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 30 seconds</span>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    completed: { label: 'Completed', cls: 'border-severity-success/30 bg-severity-success/10 text-severity-success', Icon: CheckCircle2 },
    dead: { label: 'Dead', cls: 'border-severity-critical/30 bg-severity-critical/10 text-severity-critical', Icon: Skull },
    cancelled: { label: 'Cancelled', cls: 'border-border-subtle bg-surface text-fg-muted', Icon: XCircle },
    pending: { label: 'Pending', cls: 'border-severity-warn/30 bg-severity-warn/10 text-severity-warn', Icon: AlertTriangle },
  }
  const { label, cls, Icon } = map[state] ?? map.pending
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function StatCard({
  label,
  value,
  alert,
  mono,
}: {
  label: string
  value: string
  alert?: boolean
  mono?: boolean
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-2 text-center">
      <div
        className={`text-sm font-semibold ${alert ? 'text-severity-error' : 'text-fg-primary'} ${mono ? 'font-mono text-xs' : ''}`}
        data-numeric
      >
        {value}
      </div>
      <div className="text-[10px] text-fg-muted mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-2">
      <h2 className="text-xs font-medium text-fg-secondary">{title}</h2>
      {children}
    </div>
  )
}

function TimeRow({ label, iso }: { label: string; iso: string | null }) {
  if (!iso) return null
  const d = new Date(iso)
  const formatted = d.toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-fg-muted">{label}</span>
      <span className="font-mono text-fg-secondary" data-numeric>{formatted}</span>
    </div>
  )
}

function JsonBlock({ data }: { data: unknown }) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return (
    <pre className="text-[11px] font-mono text-fg-secondary whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
      {text}
    </pre>
  )
}
