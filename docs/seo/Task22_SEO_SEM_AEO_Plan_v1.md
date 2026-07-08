# Task #22 – 365-Day Autonomous SEO/SEM/AEO System (Phase 1 Deliverable)

Repo: prashanthrangineni-sketch/pranix-ai-labs
Scope: pranixailabs.com (corporate site + founder dashboard; dashboard stays noindexed)
Authored by: Perplexity (research/content worker), adapted and applied by Claude (orchestrator) on 2026-07-08. Founder reviews and merges.

## Phase 1 – Baseline SEO/AEO hardening (this PR)

1. Root metadata (`app/layout.tsx`):
   - Explicit default title naming "Sovereign AI Product Studio" and Cart2Save, QuietKeep, QuickScanZ, School OS.
   - Descriptive meta description aligned with compliance-first, auditable AI messaging.
   - OG + Twitter tags for rich previews and AI crawlers (using `/icon-512.png` until a dedicated OG image exists).
   - JSON-LD `Organization` (founder, logo, Hyderabad location, LinkedIn sameAs) and `WebSite` blocks.

2. Crawling and discovery (Next.js metadata routes, matching the repo's existing `app/manifest.ts` pattern):
   - `app/robots.ts` — allow all agents, disallow `/founder/` and `/api/`, point at the sitemap.
   - `app/sitemap.ts` — real public routes only: `/`, `/products`, `/infrastructure`, `/status`.

Deliberate deviations from the original spec (Perplexity's draft, `Perplexity_Task22_SEO_Payload_2026-07-08.md` in the working folder):
- No `SearchAction` in WebSite JSON-LD — the site has no on-site search; fake structured data hurts AEO trust.
- No canonical tag in the root layout — a layout-level canonical would mis-canonicalize every page; canonicals belong per-page (Phase 2).
- Static `public/robots.txt` / `public/sitemap.xml` replaced with typed metadata routes so the build verifies them.
- Product pages (`/cart2save` etc.) don't exist on this site as routes; product deep-links belong to their own domains (cart2save.com, quietkeep.com, quickscanz.com, schoolos.in) and their own repos' SEO PRs.

## Phase 2 – Route-specific SEO (next PR)

- Per-route `metadata` exports (title, description, canonical) for `/products`, `/infrastructure`, `/status`.
- JSON-LD `SoftwareApplication`/`Product` blocks per product where a route or section exists.
- AI-overview-friendly copy: concise "What is X?", "Who is it for?", "Why does it exist?" sections.
- Dedicated OG image (1200×630) replacing the icon fallback.

## Phase 3 – SEM/AEO automation hooks

- Weekly SEO/AEO checklists and telemetry (page health, index coverage, Core Web Vitals).
- JSON endpoint exposing key metadata/structured data for autonomous agents.
- Log-based monitoring: sitemap fetch success, robots parsing, structured-data validation errors, AI-overview snippet detection.
- Extend the same baseline to the other product repos/domains (each as its own small PR).

This file documents what changed in Phase 1 and sets clear follow-up PRs for Task #22.
