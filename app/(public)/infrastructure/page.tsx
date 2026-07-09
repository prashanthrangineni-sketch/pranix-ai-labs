import type { Metadata } from 'next'
import { Layers, Cpu, GitBranch, Activity, Database, Shield } from 'lucide-react'

const PAGE_URL = 'https://www.pranixailabs.com/infrastructure'
const PAGE_TITLE = 'Infrastructure | Pranix AI Labs'
const PAGE_DESCRIPTION = 'The Pranix Agent Engine — sovereign control plane architecture, worker topology, inference cascade, and governance protocols behind every Pranix AI Labs product.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'Pranix AI Labs',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

export default function InfrastructurePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <h1 className="text-xl font-semibold md:text-2xl">Infrastructure</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-secondary">
        The Pranix Agent Engine is a sovereign control plane for
        multi-product AI orchestration. Every operation is auditable,
        every mutation is protocol-governed, every decision is logged.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {INFRA_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-border-subtle bg-surface p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
              <section.icon className="h-5 w-5 text-accent" />
            </div>
            <h2 className="mt-4 text-base font-medium text-fg-primary">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              {section.description}
            </p>
            {section.details && (
              <ul className="mt-3 space-y-1">
                {section.details.map((d) => (
                  <li key={d} className="text-xs text-fg-muted">
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const INFRA_SECTIONS = [
  { title: 'Control Plane', description: 'Central Supabase project managing task orchestration, execution memory, audit logging, and project registry across all products.', icon: Database, details: ['Task queue with DAG dependencies', 'Execution memory for cross-session continuity', 'MCP gateway with 29+ deployed tools'] },
  { title: 'Worker Topology', description: 'Three-tier worker architecture: lightweight cron ticks, Supabase edge function workers, and Fly.io browser automation.', icon: Layers, details: ['Tier 0 — Vercel cron (60s tick)', 'Tier 1 — Supabase heavy-worker (2min tick)', 'Tier 2 — Fly.io browser worker (planned)'] },
  { title: 'Inference Cascade', description: 'Hybrid inference routing: deterministic rules first, then local models, then premium APIs. Cheapest successful result wins.', icon: Cpu, details: ['T0 — Deterministic (always available)', 'T1 — Ollama / NVIDIA NIM', 'T2 — Anthropic / OpenAI', 'T3 — Browser fallback (experimental)'] },
  { title: 'Governance Protocols', description: 'Six versioned protocols governing all mutations: repo patches, hotfixes, CI failures, deployment verification, browser tests, and rollbacks.', icon: GitBranch, details: ['Never push to main directly', 'All PRs require founder merge', 'Agents cannot revert autonomously'] },
  { title: 'Event Sourcing', description: 'Every task state transition emits a task_event. Every MCP tool call is logged to mcp_audit_logs. Every deployment is verified.', icon: Activity, details: ['Task event trail per operation', 'MCP audit log with latency + status', 'Deployment verification protocol'] },
  { title: 'Security Model', description: 'Scoped bearer tokens, time-bounded grants, tool-level permissions, founder-only write access. No admin shortcuts.', icon: Shield, details: ['Bearer to client_id to permissions', 'Grants require explicit approval', 'All writes audited to mcp_audit_logs'] },
] as const
