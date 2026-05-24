# 01 — Operational Reconciliation

**Date:** May 24, 2026 | **Status:** Live Production

## Confirmed Production State

- URL: https://www.pranixailabs.com
- Framework: Next.js 14.2.15, Vercel (team: pranix-ai-labs-s-projects)
- Supabase: mvdjyjccvioxircxuzgz (pranix_agents control plane)
- PRs merged: #1–#8 all on main

## Founder Auth
- Magic link via Supabase Auth (OTP)
- Cookie-based session (@supabase/ssr)
- Middleware gates /founder/* — redirects to /founder/login if unauthenticated
- Allowlist: dashboard_founders table (RLS: authenticated sees own row only)
- Callback: /founder/auth/confirm (route handler, server-side code exchange)

## Route Map
PUBLIC:
  / — Home (pranixailabs.com)
  /products — Product portfolio
  /infrastructure — System architecture
  /status — Live infrastructure health

FOUNDER (auth-gated):
  /founder — Overview (system pulse, task counts, alerts, digest)
  /founder/products — Product health grid
  /founder/tasks — Task queue (paginated, filterable by state)
  /founder/alerts — Failure patterns + alert severity counts
  /founder/approvals — MCP grant lifecycle (pending/active/expired)
  /founder/workers — Worker topology + recent runs
  /founder/memory — Execution memory entries
  /founder/more — Navigation overflow (workers, memory, docs)

## Data Layer
lib/supabase.ts — server-only SSR client (next/headers, server-only guard)
lib/supabase-browser.ts — browser client (login page only)
lib/queries.ts — all Supabase reads (ISR server components)
lib/auth.ts — getFounderSession() server-side check
lib/pranix-mcp.ts — server-only MCP HTTP wrapper (PRANIX_FOUNDER_BEARER)
middleware.ts — session refresh + /founder/* gate

## Mutation Surface
- Approve grants: app/founder/approvals/actions.ts (server action)
  → lib/pranix-mcp.ts → POST pranix-agent-engine.vercel.app/api/mcp
  → mcp_access_approve_grant tool
- Writes NEVER use the anon Supabase client
- PRANIX_FOUNDER_BEARER: server env var only, never client-side

## Control Plane Reality (May 24, 2026)
- Tasks: 3,339 completed / 248 dead / 4 cancelled / 0 pending
- Dead task top causes: github_read_file directory errors (112),
  stalled patches (47), 404 path errors (21), PAT 403s (15)
- Failure patterns: 5 active (filter: status='active', not 'open')
- Active grants: 1 / Expired: 14 / Revoked: 7 / Pending: 0
- Worker crons: 20 active (Tier 0: Vercel, Tier 1: Supabase edge fn)

## Env Vars Required (Vercel production)
NEXT_PUBLIC_SUPABASE_URL — control plane URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — anon key (read-only through RLS)
PRANIX_FOUNDER_BEARER — founder MCP bearer (server-only)

## Pending (Phase 2 continuation)
- /founder/tasks/[id] — task detail page
- /founder/orchestrate — AI orchestration surface
- PWA manifest + installability
- Push notifications (VAPID)
- DAG visualization

## Locked Decisions
- Writes go through MCP only, never direct Supabase service role
- Mobile-first: all founder pages designed for Android Chrome
- ISR revalidation: 15–60s per page (no client-side polling)
- No fabricated metrics, no fake operational state
- Layer progression: observability → approvals → orchestration → autonomous
