import type { Metadata } from 'next'
import { Mail, Inbox, AlertCircle, Clock } from 'lucide-react'
import { getControlPlane } from '../../lib/control-plane'

export const metadata: Metadata = { title: 'Email' }
export const revalidate = 60

// The four mailboxes the triage agent is meant to cover.
//
// Two are live through the Gmail API. The other two sit on Hostinger, which
// the Gmail path cannot reach no matter what OAuth scopes are granted — they
// need an IMAP adapter that does not exist yet. Listing all four, and showing
// plainly which are connected, is the point: a view that quietly showed only
// the working ones would hide half the inbox.
const MAILBOXES = [
  { addr: 'pranixailabs@gmail.com', via: 'Gmail API' },
  { addr: 'prashanthrangineni@gmail.com', via: 'Gmail API' },
  { addr: 'founder@pranixailabs.com', via: 'Hostinger IMAP' },
  { addr: 'support@pranixailabs.com', via: 'Hostinger IMAP' },
] as const

type EmailRow = {
  id: number
  email_id: string | null
  source_account: string | null
  subject: string | null
  sender: string | null
  classification: string | null
  urgency: string | null
  requires_response: boolean | null
  acknowledged: boolean | null
  received_at: string | null
}

// Read through the service-role control-plane client, which is how every other
// consumer of this table in the repo reaches it (see
// app/api/founder/send-email-reply/route.ts). The anon SSR client used by
// lib/queries.ts has no verified policy on founder_email_intelligence.
async function getTriagedEmail(): Promise<{ rows: EmailRow[]; error: string | null }> {
  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('founder_email_intelligence')
      .select(
        'id, email_id, source_account, subject, sender, classification, urgency, requires_response, acknowledged, received_at',
      )
      .order('received_at', { ascending: false })
      .limit(100)
    if (error) return { rows: [], error: error.message }
    return { rows: (data ?? []) as EmailRow[], error: null }
  } catch (err) {
    // A missing env var throws rather than returning an error — surface it as
    // a visible failure instead of an empty inbox that looks like good news.
    return { rows: [], error: err instanceof Error ? err.message : String(err) }
  }
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

const URGENCY_CLASS: Record<string, string> = {
  critical: 'text-severity-critical',
  high: 'text-severity-error',
  medium: 'text-severity-warn',
  low: 'text-fg-muted',
}

export default async function FounderEmailPage() {
  const { rows, error } = await getTriagedEmail()

  const needsReply = rows.filter((r) => r.requires_response).length
  const unread = rows.filter((r) => !r.acknowledged).length
  const seen = new Set(rows.map((r) => r.source_account).filter(Boolean) as string[])
  const liveBoxes = MAILBOXES.filter((m) => seen.has(m.addr)).length

  const byClass = new Map<string, number>()
  for (const r of rows) {
    const k = r.classification ?? 'unclassified'
    byClass.set(k, (byClass.get(k) ?? 0) + 1)
  }
  const classes = [...byClass.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">Email</h1>

      {error && (
        <div className="rounded-lg border border-severity-critical/30 bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-severity-critical" />
            <h2 className="text-sm font-medium text-severity-critical">Could not read the inbox</h2>
          </div>
          <p className="text-xs text-fg-muted">{error}</p>
          <p className="text-xs text-fg-muted mt-1">
            This is a failure, not an empty inbox. Nothing below is trustworthy until it clears.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Triaged" value={rows.length} />
        <Stat label="Needs reply" value={needsReply} variant={needsReply ? 'warn' : 'muted'} />
        <Stat label="Unread" value={unread} variant={unread ? 'warn' : 'muted'} />
        <Stat
          label="Mailboxes"
          value={`${liveBoxes}/${MAILBOXES.length}`}
          variant={liveBoxes === MAILBOXES.length ? 'success' : 'critical'}
        />
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Inbox className="h-4 w-4 text-fg-muted" />
          <h2 className="text-sm font-medium text-fg-primary">Mailboxes</h2>
        </div>
        <div className="space-y-2">
          {MAILBOXES.map((m) => {
            const count = rows.filter((r) => r.source_account === m.addr).length
            const live = seen.has(m.addr)
            return (
              <div key={m.addr} className="flex items-center gap-3">
                <span className="text-xs text-fg-primary truncate flex-1">{m.addr}</span>
                <span className="text-xs text-fg-muted">{m.via}</span>
                {live ? (
                  <span className="text-xs font-mono text-fg-secondary" data-numeric>
                    {count}
                  </span>
                ) : (
                  <span className="text-xs text-fg-disabled">no adapter yet</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {classes.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-fg-muted" />
            <h2 className="text-sm font-medium text-fg-primary">What is arriving</h2>
          </div>
          <div className="space-y-2">
            {classes.map(([name, n]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">{name.replace(/_/g, ' ')}</span>
                <span className="text-xs font-mono text-fg-muted" data-numeric>
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-medium text-fg-primary mb-3">Recent ({rows.length})</h2>
        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.slice(0, 40).map((r) => (
              <div
                key={r.id}
                className="border-b border-border-subtle pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-fg-primary">
                    {r.subject || '(no subject)'}
                  </span>
                  <span className="text-xs text-fg-muted whitespace-nowrap">
                    {relTime(r.received_at)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                  <span className="truncate max-w-[55%]">{r.sender || 'unknown sender'}</span>
                  <span>· {(r.classification ?? 'unclassified').replace(/_/g, ' ')}</span>
                  {r.urgency && (
                    <span className={URGENCY_CLASS[r.urgency] ?? 'text-fg-muted'}>
                      · {r.urgency}
                    </span>
                  )}
                  {r.requires_response && (
                    <span className="text-severity-error">· needs reply</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-fg-muted">
            {error
              ? 'Not loaded — see the error above.'
              : 'Nothing triaged yet. The triage agent runs every two hours.'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 60 seconds</span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  variant = 'muted',
}: {
  label: string
  value: number | string
  variant?: 'muted' | 'warn' | 'critical' | 'success'
}) {
  const colors = {
    muted: 'border-border-subtle text-fg-primary',
    warn: 'border-severity-warn/20 text-severity-warn',
    critical: 'border-severity-critical/20 text-severity-critical',
    success: 'border-severity-success/20 text-severity-success',
  }
  return (
    <div className={`rounded-md border bg-surface p-2 text-center ${colors[variant]}`}>
      <div className="text-base font-semibold" data-numeric>
        {value}
      </div>
      <div className="text-[10px] text-fg-muted">{label}</div>
    </div>
  )
}
