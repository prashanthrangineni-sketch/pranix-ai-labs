import type { Metadata } from 'next'
import { Boxes, ExternalLink, ShieldCheck, CircleDot } from 'lucide-react'
import { getAccountHub, type IntegrationStatus } from '@/lib/integrations'
import { AccountActions } from './account-actions'

export const metadata: Metadata = { title: 'Accounts' }
export const dynamic = 'force-dynamic'

export default async function AccountHubPage() {
  const { groups, monitoredCount, connectedCount } = await getAccountHub()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg-primary">Accounts &amp; Integrations</h1>
        </div>
        <p className="text-[13px] text-fg-muted">
          Your connected services. {connectedCount} live · {monitoredCount} monitored here · open any console to manage it.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.category} className="space-y-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-fg-disabled">{g.category}</h2>
          <div className="grid grid-cols-1 gap-3">
            {g.items.map((it) => <Card key={it.id} it={it} />)}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-fg-disabled">
        Live status and health are shown for AI model providers (read from the provider registry).
        For other services, status isn’t tracked inside Pranix yet — use “Open console” to verify.
        Token expiry isn’t stored here.
      </p>
    </div>
  )
}

function Card({ it }: { it: IntegrationStatus }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-[13px] font-bold text-fg-secondary">
            {it.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-fg-primary">{it.name}</p>
            <p className="truncate text-[11px] text-fg-disabled">{it.category}</p>
          </div>
        </div>
        <StatusBadge it={it} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <Row label="Health">{it.monitored ? humanHealth(it.health) : 'Not tracked here'}</Row>
        <Row label="Token expiry">Not tracked</Row>
        <Row label="Last checked">{it.monitored ? rel(it.checked_at) : '—'}</Row>
        <Row label="Permissions">
          <a href="/founder/approvals" className="inline-flex items-center gap-0.5 text-accent hover:underline">
            <ShieldCheck className="h-3 w-3" /> View
          </a>
        </Row>
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={it.console_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-accent hover:bg-elevated"
        >
          Open console <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <AccountActions integrationId={it.id} integrationName={it.name} monitored={it.monitored} />
    </div>
  )
}

function StatusBadge({ it }: { it: IntegrationStatus }) {
  let cls = 'border-border-subtle bg-canvas text-fg-muted'
  let label = 'Open console to verify'
  if (it.monitored) {
    if (it.connected) { cls = 'border-severity-success/30 bg-severity-success/10 text-severity-success'; label = 'Connected' }
    else { cls = 'border-border-subtle bg-elevated text-fg-muted'; label = 'Disabled' }
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <CircleDot className="h-3 w-3" /> {label}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-fg-disabled">{label}</dt>
      <dd className="truncate text-fg-secondary">{children}</dd>
    </div>
  )
}

function humanHealth(h: string | null): string {
  if (!h || h === 'unknown') return 'Unknown'
  return h.charAt(0).toUpperCase() + h.slice(1)
}

function rel(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
