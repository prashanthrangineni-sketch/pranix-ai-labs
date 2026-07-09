import type { Metadata } from 'next'
import {
  getMissions,
  getMissionSteps,
  getRecentVerifications,
  getWorkerHeartbeats,
  type Mission,
  type MissionStep,
} from '@/lib/mission-queries'
import { Rocket, ShieldCheck, AlertTriangle, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'
import InstallPranixApp from '@/app/founder/_components/InstallPranixApp'

export const metadata: Metadata = { title: 'Mission Control' }
export const revalidate = 60

const STATE_LABELS: Record<MissionStep['state'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  claimed_done: 'Claimed done (unverified)',
  verified: 'Verified',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

function StepStateBadge({ state }: { state: MissionStep['state'] }) {
  const cls =
    state === 'verified'
      ? 'text-severity-ok'
      : state === 'claimed_done'
        ? 'text-severity-warn'
        : state === 'failed'
          ? 'text-severity-critical'
          : 'text-fg-muted'
  const Icon =
    state === 'verified'
      ? CheckCircle2
      : state === 'failed'
        ? XCircle
        : state === 'claimed_done'
          ? AlertTriangle
          : Clock
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cls}`}>
      <Icon className="h-3 w-3" />
      {STATE_LABELS[state]}
    </span>
  )
}

function MissionCard({ mission, steps }: { mission: Mission; steps: MissionStep[] }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-fg-primary">{mission.title}</h3>
          {mission.intent && <p className="text-xs text-fg-muted mt-0.5">{mission.intent}</p>}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-fg-disabled shrink-0">{mission.product ?? '—'}</span>
      </div>

      {mission.needs_founder && mission.founder_action && (
        <div className="rounded-md border border-severity-warn/40 bg-canvas p-2 text-xs text-fg-secondary flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-severity-warn shrink-0 mt-0.5" />
          <span>
            <span className="font-medium text-fg-primary">Your call: </span>
            {mission.founder_action}
          </span>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-1 pt-1">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs py-0.5">
              <span className="text-fg-secondary truncate">
                <span className="text-fg-disabled mr-1">{s.worker}:</span>
                {s.artifact_url ? (
                  <a href={s.artifact_url} className="underline decoration-border-subtle hover:text-fg-primary" target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </span>
              <StepStateBadge state={s.state} />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-fg-disabled pt-1">
        <span>{mission.status}</span>
        <span>·</span>
        <span>by {mission.created_by}</span>
        <span>·</span>
        <span>
          updated{' '}
          {new Date(mission.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

export default async function MissionControlPage() {
  const [missions, steps, verifications, heartbeats] = await Promise.all([
    getMissions(),
    getMissionSteps(),
    getRecentVerifications(),
    getWorkerHeartbeats(),
  ])

  const stepsByMission = steps.reduce<Record<string, MissionStep[]>>((acc, s) => {
    if (!acc[s.mission_id]) acc[s.mission_id] = []
    acc[s.mission_id].push(s)
    return acc
  }, {})

  const open = missions.filter((m) => m.status === 'active' || m.status === 'blocked' || m.status === 'proposed')
  const needsYou = open.filter((m) => m.needs_founder)
  const running = open.filter((m) => !m.needs_founder)
  const recentDone = missions.filter((m) => m.status === 'completed').slice(0, 5)

  return (
    <div className="px-4 py-6 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-fg-muted" />
          <h1 className="text-lg font-semibold text-fg-primary">Mission Control</h1>
        </div>
        <p className="text-xs text-fg-muted">
          Every mission, who is on it, and its <span className="font-medium">verified</span> state — a step only counts as done
          when a different identity checked the live source of truth (verifier independence).
        </p>
      </div>

      <InstallPranixApp />

      {heartbeats.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-fg-muted" />
            <h2 className="text-sm font-medium text-fg-primary">Workers</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {heartbeats.map((w) => (
              <div key={w.worker} className="rounded-md bg-canvas px-3 py-1.5 text-xs">
                <span className="font-medium text-fg-secondary">{w.worker}</span>
                <span className="text-fg-disabled ml-2">{w.status}</span>
                {w.current_task && <span className="text-fg-muted ml-2 truncate inline-block max-w-[220px] align-bottom">{w.current_task}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-fg-primary flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-severity-warn" />
          Needs you ({needsYou.length})
        </h2>
        {needsYou.length === 0 && <p className="text-xs text-fg-disabled italic">Nothing is waiting on you right now.</p>}
        {needsYou.map((m) => (
          <MissionCard key={m.id} mission={m} steps={stepsByMission[m.id] ?? []} />
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-fg-primary flex items-center gap-2">
          <Rocket className="h-4 w-4 text-fg-muted" />
          Running ({running.length})
        </h2>
        {running.length === 0 && <p className="text-xs text-fg-disabled italic">No active missions.</p>}
        {running.map((m) => (
          <MissionCard key={m.id} mission={m} steps={stepsByMission[m.id] ?? []} />
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t border-border-subtle">
        <h2 className="text-sm font-semibold text-fg-primary flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-fg-muted" />
          Recent verifications ({verifications.length})
        </h2>
        {verifications.length === 0 && (
          <p className="text-xs text-fg-disabled italic">No verification records yet — they appear as the Deploy Guardian (Phase 2) and orchestrator write them.</p>
        )}
        <div className="space-y-1">
          {verifications.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 text-xs rounded-md bg-canvas px-2 py-1.5">
              <span className="text-fg-secondary truncate">
                <span className="text-fg-disabled">{v.verifier}</span> checked <span className="text-fg-disabled">{v.worker}</span>
                {v.evidence_url && (
                  <>
                    {' — '}
                    <a href={v.evidence_url} className="underline decoration-border-subtle hover:text-fg-primary" target="_blank" rel="noreferrer">
                      evidence
                    </a>
                  </>
                )}
                {v.evidence_note && <span className="text-fg-muted"> · {v.evidence_note}</span>}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wide shrink-0 ${
                  v.verdict === 'pass' ? 'text-severity-ok' : v.verdict === 'fail' ? 'text-severity-critical' : 'text-severity-warn'
                }`}
              >
                {v.verdict}
              </span>
            </div>
          ))}
        </div>
      </div>

      {recentDone.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border-subtle">
          <h2 className="text-sm font-semibold text-fg-primary">Recently completed</h2>
          {recentDone.map((m) => (
            <MissionCard key={m.id} mission={m} steps={stepsByMission[m.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  )
}
