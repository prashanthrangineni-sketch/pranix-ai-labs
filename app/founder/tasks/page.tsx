import type { Metadata } from 'next'
import Link from 'next/link'
import { getTasksPage, type TaskRow, type TaskState } from '@/lib/queries'
import { Clock, Skull, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Tasks' }
export const revalidate = 30

type StateFilter = TaskState | 'all'

const FILTERS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'dead', label: 'Dead' },
  { value: 'cancelled', label: 'Cancelled' },
]

function parseFilter(raw: string | undefined): StateFilter {
  if (raw === 'completed' || raw === 'dead' || raw === 'cancelled' || raw === 'pending') return raw
  return 'all'
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export default async function FounderTasksPage({
  searchParams,
}: {
  searchParams: { state?: string; page?: string }
}) {
  const state = parseFilter(searchParams.state)
  const page = parsePage(searchParams.page)
  const pageSize = 50

  const result = await getTasksPage({ state, page, pageSize })

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Task Queue</h1>
        <span className="text-xs text-fg-muted" data-numeric>
          page {page + 1}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTERS.map((f) => {
          const active = f.value === state
          const href = `/founder/tasks?state=${f.value}`
          return (
            <Link
              key={f.value}
              href={href}
              prefetch={false}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors duration-fast ${
                active
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-border-subtle bg-surface text-fg-muted hover:text-fg-primary'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface">
        {result.rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-fg-muted">
            No tasks match this filter.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {result.rows.map((task) => (
              <TaskRowItem key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>

      <Pager state={state} page={page} hasMore={result.hasMore} />

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 30 seconds</span>
      </div>
    </div>
  )
}

function TaskRowItem({ task }: { task: TaskRow }) {
  const isDead = task.state === 'dead'
  const isCancelled = task.state === 'cancelled'

  const Icon =
    task.state === 'completed'
      ? CheckCircle2
      : isDead
      ? Skull
      : isCancelled
      ? XCircle
      : AlertTriangle

  const iconClass =
    task.state === 'completed'
      ? 'text-severity-success'
      : isDead
      ? 'text-severity-critical'
      : isCancelled
      ? 'text-fg-muted'
      : 'text-severity-warn'

  const rowClass = isDead
    ? 'bg-severity-critical/5 border-l-2 border-l-severity-critical'
    : ''

  const when = task.completed_at || task.started_at || task.created_at
  const timeLabel = new Date(when).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className={`flex items-start gap-3 p-3 ${rowClass}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-fg-primary truncate">
            {task.action}
          </span>
          <span className="text-[10px] text-fg-disabled shrink-0" data-numeric>
            {timeLabel}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-muted">
          {task.tier !== null && (
            <span data-numeric>
              tier <span className="text-fg-secondary">{task.tier}</span>
            </span>
          )}
          {task.priority !== null && (
            <span data-numeric>
              prio <span className="text-fg-secondary">{task.priority}</span>
            </span>
          )}
          <span data-numeric>
            attempts{' '}
            <span
              className={
                task.max_attempts !== null && task.attempts >= task.max_attempts
                  ? 'text-severity-error'
                  : 'text-fg-secondary'
              }
            >
              {task.attempts}
              {task.max_attempts !== null ? `/${task.max_attempts}` : ''}
            </span>
          </span>
          {task.parent_job_id && (
            <span className="font-mono truncate max-w-[140px]" title={task.parent_job_id}>
              job {task.parent_job_id.slice(0, 8)}
            </span>
          )}
        </div>
        {task.last_error && (
          <div className="mt-1 rounded bg-canvas px-2 py-1 text-[10px] font-mono text-severity-error">
            {task.last_error.length > 160
              ? `${task.last_error.slice(0, 160)}\u2026`
              : task.last_error}
          </div>
        )}
      </div>
    </li>
  )
}

function Pager({
  state,
  page,
  hasMore,
}: {
  state: StateFilter
  page: number
  hasMore: boolean
}) {
  const prevDisabled = page <= 0
  const nextDisabled = !hasMore

  const prevHref = `/founder/tasks?state=${state}&page=${Math.max(0, page - 1)}`
  const nextHref = `/founder/tasks?state=${state}&page=${page + 1}`

  return (
    <div className="flex items-center justify-between gap-3">
      <PagerLink href={prevHref} disabled={prevDisabled} direction="prev" />
      <PagerLink href={nextHref} disabled={nextDisabled} direction="next" />
    </div>
  )
}

function PagerLink({
  href,
  disabled,
  direction,
}: {
  href: string
  disabled: boolean
  direction: 'prev' | 'next'
}) {
  const label = direction === 'prev' ? 'Previous' : 'Next'
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight

  const base =
    'flex flex-1 items-center justify-center gap-1 rounded-md border px-3 py-2 text-xs transition-colors duration-fast'
  const enabled =
    'border-border-subtle bg-surface text-fg-primary hover:bg-elevated'
  const off = 'border-border-subtle bg-surface text-fg-disabled pointer-events-none opacity-50'

  if (disabled) {
    return (
      <span aria-disabled className={`${base} ${off}`}>
        {direction === 'prev' && <Icon className="h-3.5 w-3.5" />}
        {label}
        {direction === 'next' && <Icon className="h-3.5 w-3.5" />}
      </span>
    )
  }

  return (
    <Link href={href} prefetch={false} className={`${base} ${enabled}`}>
      {direction === 'prev' && <Icon className="h-3.5 w-3.5" />}
      {label}
      {direction === 'next' && <Icon className="h-3.5 w-3.5" />}
    </Link>
  )
}
