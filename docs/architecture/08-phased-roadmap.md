# 08 — Phased Roadmap

Layer progression locked: Layer 1 (operational visibility) -> Layer 2 (approvals + continuity) -> Layer 3 (AI orchestration) -> Layer 4 (advanced autonomous). Do not skip layers.

---

## Phase 0 — Foundation Shell (COMPLETE)

- Next.js 14 App Router scaffold
- Design token system in CSS custom properties
- Public site shell: home, products, infrastructure, status
- Founder dashboard shell: layout with bottom nav, overview with source annotations
- Architecture docs committed to /docs/architecture/

## Phase 1 — Operational MVP (CURRENT)

- Wire real data from control plane into all founder surfaces
- Server components with ISR revalidation
- Supabase Auth (magic link) for founder access
- Public status page with live infrastructure health
- lib/supabase.ts + lib/queries.ts + lib/auth.ts data layer
- Founder pages: overview, products, workers, alerts, memory, more

## Phase 2 — Approvals + Tasks + Orchestration

- Task queue UI (pending/running/completed/dead)
- Single task detail with event trail
- DAG visualization (parent_job_id rollups)
- Grant approval flow (one-tap approve/deny)
- AI orchestration surface (/founder/orchestrate)
- Provider picker with real tier availability
- PWA manifest + service worker + offline cache

## Phase 3 — Browser Bridge + Push

- Deploy browser worker to Fly.io
- Browser artifact gallery
- VAPID push notifications for critical alerts
- TWA wrapper for Play Store
- Deployment verification timeline

## Phase 4+ — North Star

- Background sync for offline mutations
- Custom inference cascade configuration
- Automated smoke test scheduling
- Cross-product correlation in alerts
- IoT integration preparation (QuietKeep hardware)

---

## Vercel Framework Switch

Currently the repo has both static HTML (index.html, founder/*.html) and Next.js (app/). Vercel serves the static HTML because vercel.json has static rewrites.

Framework switch plan:
1. Separate PR to update vercel.json for Next.js framework detection
2. Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Configure Supabase Auth: Site URL + redirect URLs
4. Add RLS policies on control plane tables for anon key reads
5. Verify preview deployment before merging
6. Old static HTML remains in repo as reference until all pages are ported

---

## Success Criteria Per Phase

| Phase | Criteria |
|---|---|
| Phase 0 | Compiles, generates 8 pages, design tokens work |
| Phase 1 | Every number on screen comes from a real query. Auth works. |
| Phase 2 | Founder can approve grants and view task detail from phone |
| Phase 3 | Push notification reaches phone within 30s of critical alert |
| Phase 4 | Founder can queue work and check results without opening Claude |
