# 01 — Operational Reconciliation

**Date:** May 24, 2026 | **Status:** Live Production | **Authority:** Master Orchestrator Thread

This document is the single source of truth for the Pranix AI Labs website and founder dashboard. All child agents, execution threads, and future sessions inherit from this.

---

## Confirmed Production State

| Item | Value |
|------|-------|
| URL | https://www.pranixailabs.com |
| Framework | Next.js 14.2.15 |
| Hosting | Vercel — team: pranix-ai-labs-s-projects |
| Project ID | prj_VUQiwAYTDJV8PGtTncSXe8d70eJ4 |
| Control plane | Supabase mvdjyjccvioxircxuzgz (pranix_agents) |
| PRs merged | #1–#9 all on main |
| Latest SHA | d714a9b (PR #8 auth gate + PR #9 docs) |
| Build status | READY — zero runtime errors |

---

## Founder Auth

| Item | Detail |
|------|--------|
| Method | Supabase Auth magic link (OTP) |
| Session storage | HTTP-only cookies via @supabase/ssr |
| Gate | middleware.ts — /founder/* requires valid session |
| Allowlist | dashboard_founders table |
| RLS | authenticated role reads own row only (email = auth.jwt()->>'email') |
| Anon | blocked (block_anon_access policy) |
| Callback | /founder/auth/confirm — Route Handler, server-side code exchange |
| Fallback | /founder/auth/callback — forwarder for stale magic links |
| Login | /founder/login — Client Component, useSearchParams in Suspense |

---

## Route Map

### Public (no auth)
```
/                    Home
/products            Product portfolio
/infrastructure      System architecture
/status              Live infrastructure health
/founder/login       Magic link login form
/founder/auth/confirm  Magic link code exchange (server Route Handler)
/founder/auth/callback Legacy forwarder
```

### Founder (auth-gated via middleware)
```
/founder             Overview — system pulse, task counts, alerts, digest
/founder/products    Product health grid (project_registry)
/founder/tasks       Task queue — paginated, filterable by state
/founder/tasks/[id]  Task detail — full inspection (Phase 2, pending)
/founder/alerts      Failure patterns + alert severity counts
/founder/approvals   Grant lifecycle — pending/active/expired + approve button
/founder/workers     Worker topology + recent runs
/founder/memory      Execution memory entries (execution_memory table)
/founder/orchestrate Inference routing surface (Phase 2, pending)
/founder/more        Navigation overflow (workers, memory, docs, orchestrate)
```

---

## Data Layer

```
lib/supabase.ts          Server-only SSR client (next/headers + 'server-only' guard)
lib/supabase-browser.ts  Browser client — login page ONLY
lib/queries.ts           All Supabase reads — server components call these
lib/auth.ts              getFounderSession() — server-side allowlist check
lib/pranix-mcp.ts        Server-only MCP HTTP wrapper (PRANIX_FOUNDER_BEARER)
middleware.ts            Session refresh on every request + /founder/* gate
```

**ISR revalidation cadence:**
- Overview, alerts: 60s
- Workers: 30s
- Approvals: 15s
- Tasks: 30s
- Memory, products: no revalidation (on-demand)

---

## Mutation Surface

```
ONLY mutation path:
  app/founder/approvals/actions.ts (server action 'use server')
    → lib/pranix-mcp.ts
    → POST https://pranix-agent-engine.vercel.app/api/mcp
    → Authorization: Bearer ${PRANIX_FOUNDER_BEARER}
    → tool: mcp_access_approve_grant
    → on success: revalidatePath('/founder/approvals') + revalidatePath('/founder')
```

**Standing rules:**
- Writes NEVER use the anon Supabase client
- PRANIX_FOUNDER_BEARER is server env var only — never client-side
- lib/pranix-mcp.ts has `import 'server-only'` — build fails if imported by client code
- All mutations require `'use server'` directive

---

## Control Plane Reality (May 24, 2026)

| Metric | Value |
|--------|-------|
| Tasks completed | 3,339 |
| Tasks dead | 248 |
| Tasks cancelled | 4 |
| Tasks pending | 0 |
| Worker runs (last 2h) | 120 |
| Active crons | 20 |
| Active grants | 1 |
| Alerts (24h) | ~500 |

**Dead task root causes:**
- 112 `github_read_file` — "path is a directory" errors (worker bug)
- 47 `github_apply_patch` — stalled, no worker pickup
- 21 `github_list_files` — 404 path errors (School-OS test path)
- 15 `github_create_branch` — PAT 403 permission errors
- 55 — unregistered action handlers

**Top alert source:** `phase_f:cron_health_monitor` (240/24h — noise, tuning pending)

**System state flag:** `engine:quota:razorpay` = degraded (missing RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in engine env — not dashboard scope)

---

## Required Env Vars (Vercel production)

| Var | Scope | Purpose |
|-----|-------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Public | Control plane URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public | Read-only through RLS |
| PRANIX_FOUNDER_BEARER | Server-only | Founder MCP bearer token |

---

## Architecture Decisions (Locked)

| Decision | Rationale |
|----------|-----------|
| Writes via MCP only | Preserves audit trail, single mutation surface |
| Cookie-based auth | Server components can read session; localStorage cannot |
| Mobile-first | Founder operates from Android Chrome |
| ISR not client polling | Predictable load, no WebSocket overhead |
| Layer progression | Observability → Approvals → Orchestration → Autonomous |
| No fabricated metrics | Every number on screen from a real DB query |
| Dark-first design | Premium feel, mobile-readable |
| server-only guards | Build-time enforcement of server/client boundaries |

---

## Phase Completion Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Foundation Shell | ✅ Complete | Shell, design tokens, public site |
| 1 — Operational MVP | ✅ Complete | Data wiring, auth, 9 founder pages |
| 2 — Approvals + Tasks | 🟡 Partial | Queue + approve done; detail page + DAG + orchestrate pending |
| 3 — Browser Bridge + Push | ❌ Not started | Fly.io worker, VAPID, TWA |
| 4 — North Star | ❌ Not started | Background sync, inference cascade config |

## Phase 2 Remaining Work

- `app/founder/tasks/[id]/page.tsx` — task detail + full error/artifact inspection
- `app/founder/orchestrate/page.tsx` — inference routing visibility surface
- `app/manifest.ts` — PWA manifest for Android installability
- Alert noise tuning — suppress `phase_f:cron_health_monitor` in UI
- DAG visualization (parent_job_id rollups)

---

## Execution Protocols (persisted in execution_memory/pranix_agents)

- `protocol:repo_patch` — branch → patch → PR → founder merge
- `protocol:rollback` — identify bad commit, revert branch, PR
- `protocol:hotfix` — hotfix/* branch, urgency PR
- `protocol:deployment_verification` — Vercel READY + logs + smoke test
- `protocol:ci_failure` — read logs, diagnose, fix branch, persist

---

*This document is auto-authoritative. When in doubt, this file wins over conversation history.*
