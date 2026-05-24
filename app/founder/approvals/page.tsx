import type { Metadata } from 'next'
import { getAllGrants, type GrantRow } from '@/lib/queries'
import { Shield, Check, Clock, ArrowUpRight } from 'lucide-react'
import { ApproveButton } from './approve-button'

export const metadata: Metadata = { title: 'Approvals' }
export const revalidate = 15

type Bucket = 'pending' | 'active' | 'expired' | 'revoked'

function bucketize(g: GrantRow, nowMs: number): Bucket {
  if (g.revoked_at) return 'revoked'
  const expMs = new Date(g.expires_at).getTime()
  if (!g.granted_at) {
    return expMs > nowMs ? 'pending' : 'expired'
  }
  return expMs > nowMs ? 'active' : 'expired'
}

export default async function FounderApprovalsPage() {
  const grants = await getAllGrants(200)
  const now = Date.now()

  const pending: GrantRow[] = []
  const active: GrantRow[] = []
  const expired: GrantRow[] = []
  for (const g of grants) {
    const b = bucketize(g, now)
    if (b === 'pending') pending.push(g)
    else if (b === 'active') active.push(g)
    else if (b === 'expired') expired.push(g)
    // 'revoked' intentionally not shown — out of scope for Phase 2B.
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Approvals</h1>
      </div>

      <Section
        label={`Pending (${pending.length})`}
        emphasis={pending.length > 0}
        empty="No grants awaiting approval."
      >
        {pending.map((g) => (
          <PendingCard key={g.id} grant={g} />
        ))}
      </Section>

      <Section
        label={`Active (${active.length})`}
        empty="No active grants."
      >
        {active.map((g) => (
          <DecidedCard key={g.id} grant={g} variant="active" />
        ))}
      </Section>

      <Section
        label={`Expired (${expired.length})`}
        empty="No expired grants in recent history."
        collapsedHint
      >
        {expired.slice(0, 20).map((g) => (
          <DecidedCard key={g.id} grant={g} variant="expired" />
        ))}
        {expired.length > 20 && (
          <p className="px-1 text-[10px] text-fg-disabled">
            Showing 20 of {expired.length}. Older grants are not displayed.
          </p>
        )}
      </Section>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 15 seconds</span>
      </div>
    </div>
  )
}

function Section({
  label,
  emphasis,
  empty,
  collapsedHint,
  children,
}: {
  label: string
  emphasis?: boolean
  empty: string
  collapsedHint?: boolean
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  const isEmpty = items.length === 0

  return (
    <section className="space-y-2">
      <h2
        className={`text-xs font-medium ${
          emphasis ? 'text-severity-warn' : 'text-fg-muted'
        }`}
      >
        {label}
      </h2>
      {isEmpty ? (
        <p className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-fg-muted">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  )
}

function PendingCard({ grant }: { grant: GrantRow }) {
  const expiresIn = formatRelativeFuture(grant.expires_at)
  return (
    <div className="rounded-lg border border-severity-warn/30 bg-severity-warn/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <ScopeBadge scope={grant.scope} />
            <span className="text-[10px] text-fg-disabled" data-numeric>
              expires {expiresIn}
            </span>
          </div>
          <div className="text-xs font-mono text-fg-primary truncate">
            {grant.resource_pattern}
          </div>
          {grant.requested_task && (
            <div className="text-[11px] text-fg-secondary line-clamp-3">
              {grant.requested_task}
            </div>
          )}
          <div className="text-[10px] font-mono text-fg-disabled">
            id {grant.id.slice(0, 8)}
          </div>
        </div>
        <ApproveButton grantId={grant.id} />
      </div>
    </div>
  )
}

function DecidedCard({
  grant,
  variant,
}: {
  grant: GrantRow
  variant: 'active' | 'expired'
}) {
  const variantClass =
    variant === 'active'
      ? 'border-border-subtle bg-surface'
      : 'border-border-subtle bg-surface opacity-70'

  const expLabel =
    variant === 'active'
      ? `expires ${formatRelativeFuture(grant.expires_at)}`
      : `expired ${formatRelativePast(grant.expires_at)}`

  return (
    <div className={`rounded-lg border p-3 ${variantClass}`}>
      <div className="flex items-center gap-2">
        <ScopeBadge scope={grant.scope} />
        <span className="text-[10px] text-fg-disabled" data-numeric>
          {expLabel}
        </span>
        {variant === 'active' && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-severity-success">
            <Check className="h-3 w-3" />
            active
          </span>
        )}
      </div>
      <div className="mt-1 text-xs font-mono text-fg-secondary truncate">
        {grant.resource_pattern}
      </div>
      {grant.requested_task && (
        <div className="mt-1 text-[11px] text-fg-muted line-clamp-2">
          {grant.requested_task}
        </div>
      )}
    </div>
  )
}

function ScopeBadge({ scope }: { scope: string }) {
  const cls =
    scope === 'admin'
      ? 'border-severity-critical/30 text-severity-critical bg-severity-critical/10'
      : scope === 'write'
      ? 'border-severity-warn/30 text-severity-warn bg-severity-warn/10'
      : 'border-border-subtle text-fg-muted bg-canvas'
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {scope}
    </span>
  )
}

function formatRelativeFuture(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'now'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `in ${hrs}h`
  const days = Math.round(hrs / 24)
  return `in ${days}d`
}

function formatRelativePast(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms <= 0) return 'just now'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

// suppress unused-import lint for icon used only conditionally
void ArrowUpRight
