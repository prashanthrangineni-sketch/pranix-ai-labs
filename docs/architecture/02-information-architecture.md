# 02 — Information Architecture

## Two Surfaces, One Codebase

The Pranix AI Labs website is two distinct experiences sharing a Next.js 14 App Router codebase, a design system, and a single Supabase backend (the `pranix_agents` control plane).

```
pranixailabs.com/
├── (public)/               ← marketing + transparency
└── (founder)/              ← auth-gated operational cockpit
```

The two surfaces share styles, components, and data clients but **never share navigation chrome**. A founder logging in does not see the public top nav; a public visitor never sees founder UI.

---

## A. Public Website Routes

```
/                           Home — protocol-grade positioning, products, infrastructure tease
/about                      About — company, founder, philosophy, registry details
/products                   Products — customer-facing product cards (5 active + 2 future)
/products/[slug]            Per-product detail (cart2save, schoolos, vidyagrid, quietkeep, quickscanz)
/infrastructure             Infrastructure — control plane, worker topology, inference cascade, MCP gateway
/research                   Research / Protocol — operational philosophy, protocols, evidence-led approach
/status                     Live Status — public read of system_state, deployment health (filtered)
/vision                     Vision — Life OS framing, long-term direction
/contact                    Contact — support@, founder@, WhatsApp, registered address
/legal/privacy              Privacy policy
/legal/terms                Terms
/founder                    Founder Login entry (form)
```

**Public footer carries:** CIN `U62011TS2026PTC209631`, MSME `UDYAM-TS-02-0307772`, DPIIT `DIPP241828`, support email, founder email, WhatsApp.

**Sitemap and robots.txt:** generated from this list. Founder routes are `noindex`.

### Public top nav (6 items + login)

```
Pranix AI Labs    Products  Infrastructure  Research  Status  About    Founder Login →
```

The 8th item (`/vision`) lives in the footer, not the top nav, to keep the top nav at 6 items. Mobile collapses to a slide-over sheet.

### What the public site does NOT expose

- Raw founder_alerts (4,583 rows of noise)
- Task queue internals
- Worker run history
- Audit findings
- MCP audit logs
- Execution memory contents
- Inference cost data
- PR/branch state
- Deployment errors (only deployment _health rollup is shown on /status, never individual error messages)

### What `/status` DOES expose (transparency without leakage)

Read from a small allow-list of safe fields:
- Per-product deployment health (healthy / degraded / unknown — derived, not raw)
- Last deployment timestamp (no commit SHAs, no logs)
- MCP gateway tools count + manifest version
- Inference tier availability (T0 always, T1/T2/T3 with on/off only, no costs)
- Worker tick freshness (heartbeat <2min = green, else amber/red)
- DAG cascade health rollup (% completed of last 24h)

This page is what credibility looks like on a public AI/infra site. It's not a status page in the Atlassian sense — it's a transparency surface that says "we run real infrastructure and we're not afraid to show it."

---

## B. Founder Command Center Routes

```
/founder                              Login (if unauth) or redirect to /founder/overview
/founder/overview                     Mission control — what needs attention right now
/founder/products                     Per-product operational state grid
/founder/products/[slug]              Per-product drill-down (audit findings + deployments + smoke tests)
/founder/tasks                        Task queue: pending / running / completed / dead / cancelled
/founder/tasks/[id]                   Single task detail (input, events, artifacts, retries)
/founder/dags                         DAG visualizations (parent_job_id rollups)
/founder/dags/[id]                    Single DAG with React Flow visualization
/founder/workers                      Worker topology (tier 0/1/2) + heartbeat freshness
/founder/inference                    Inference router state + tier availability + cost (when populated)
/founder/memory                       execution_memory grid (project x key prefix x value preview)
/founder/audit                        audit_findings explorer
/founder/audit/[id]                   Single finding with remediation action
/founder/alerts                       Grouped alerts (NOT raw — pivoted via failure_patterns + source grouping)
/founder/alerts/patterns              failure_patterns view (top patterns by occurrences)
/founder/approvals                    mcp_access_grants — pending + active + expired
/founder/deployments                  deployment_verifications timeline
/founder/browser                      Browser artifacts gallery (deferred until Fly worker live)
/founder/mcp                          MCP gateway state, tool list, manifest version, routing decisions
/founder/orchestrate                  AI orchestration surface (see doc 07)
/founder/digest                       founder_digest_log timeline
/founder/settings                     Founder allowlist, trusted devices, push subscription, API keys
```

### Founder bottom nav (mobile-first, 5 items)

```
[Overview]  [Tasks]  [Orchestrate]  [Alerts]  [More ...]
```

- **Overview** — what needs attention now
- **Tasks** — work queue, the most-touched surface
- **Orchestrate** — AI prompt + provider selection (the long-term primary surface)
- **Alerts** — grouped, severity-filtered, NOT raw
- **More** — products, dags, workers, inference, memory, audit, approvals, deployments, browser, mcp, digest, settings

This is one-thumb navigation. Bottom-anchored to respect Android safe areas and reachability. Top app bar shows page title + a single overflow action; no top tabs (vertical real estate is too precious).

### Founder desktop nav

Sidebar collapsible: same item set as mobile bottom nav, but expanded into a tree. Sidebar collapsed by default to maximize content area. Desktop is a secondary view; mobile-first is the design driver.

---

## C. Founder Overview — what it actually shows

This is the single most important screen. It must answer "what needs me right now?" in <3 seconds.

Stack order (top-to-bottom on mobile):

1. **Greeting + system pulse** — one line.
2. **Critical alerts band** — only `level=critical` from founder_alerts, deduplicated by source.
3. **Pending approvals** — `mcp_access_grants` where `granted_at IS NULL AND expires_at > now()`. One-tap approve/deny.
4. **Failure patterns rollup** — top 5 from `failure_patterns` by `occurrences` where `status = 'open'`.
5. **Product health grid** — one card per product, showing open_findings + last deployment health + last audit timestamp from `v_infra_topology`.
6. **Recent digest** — last entry from `founder_digest_log` if within 24h.
7. **Quick actions** — orchestrate prompt, run smoke test, view tasks.

Crucially: **no charts on overview**. No sparklines. No animated numbers. Reading state, not visualizing trends.

---

## D. Route Groups and Layout Shells

```
app/
├── (public)/
│   ├── layout.tsx           ← public chrome (top nav, footer)
│   ├── page.tsx             ← /
│   ├── about/page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── infrastructure/page.tsx
│   ├── research/page.tsx
│   ├── status/page.tsx
│   ├── vision/page.tsx
│   ├── contact/page.tsx
│   └── legal/
│       ├── privacy/page.tsx
│       └── terms/page.tsx
├── (founder)/
│   ├── layout.tsx           ← auth check + founder chrome
│   ├── founder/
│   │   ├── page.tsx         ← login or redirect
│   │   ├── overview/page.tsx
│   │   ├── tasks/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── settings/page.tsx
└── api/
    ├── public/              ← public read endpoints
    └── founder/             ← founder-only edge functions
```

Two route groups = two layouts = two navigation shells = zero leakage.

---

## E. URL Conventions

- All founder routes start with `/founder/` for clarity and CDN cache separation
- Product slugs are the registry `project_name` (lowercase, underscore): `cart2save`, `schoolos`, `vidyagrid`, `quietkeep`, `quickscanz`
- Task IDs, DAG IDs, audit finding IDs use UUIDs as in DB
- Public detail pages use the same slug pattern: `/products/schoolos`

---

## F. What's deferred (and where it surfaces honestly in IA)

| Surface | State | UI treatment |
|---|---|---|
| `/founder/inference` | router deployed, env vars missing, 0 calls | "Configured but not yet invoked. Set env vars to enable." |
| `/founder/browser` | Fly worker not deployed | "Browser worker code complete. Deploy to Fly to enable." |
| `/founder/orchestrate` | provider integrations vary | per-provider availability badges (see doc 07) |
| `/founder/dags/[id]` event trail | only 12 task_events rows | "Event trail begins from task creation date." |
| `/founder/deployments` | only 2 verifications recorded | "Verification protocol has run twice." |
| `/products/[slug]` for vidyagrid | build RED | Public page shows "Active Development" state |
| `/founder/products/schoolos` | URL mismatch easyvenuez.com vs schoolos.in | "Registry needs update" badge in founder view |

Gaps are part of the spec, not omissions.
