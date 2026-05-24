# Pranix AI Labs — Architecture Documentation

Stage 3 architecture documents, approved by founder on 2026-05-23.

## Documents

1. `01-reconciliation.md` — Operational reconciliation (source of truth)
2. `02-information-architecture.md` — Public + founder route hierarchy
3. `03-ux-strategy.md` — Mobile-first calm cockpit UX principles
4. `04-design-system-direction.md` — Typography, color, motion, layout
5. `05-backend-mapping.md` — Every UI surface to real table/view/RPC
6. `06-mobile-apk-strategy.md` — PWA / TWA / Capacitor decision tree
7. `07-ai-orchestration-strategy.md` — Multi-provider integration matrix
8. `08-phased-roadmap.md` — Phase 0-4 implementation plan

## Approved Decisions

- Mobile: PWA first, TWA second, Capacitor deferred
- Orchestration: observability first (Layer 1), then approvals (Layer 2), then AI (Layer 3)
- Products: customer-facing separated from infrastructure; PMIL/IELTS/InsureUPI under Research
- Alerts: auto-suppress noisy sources, preserve raw in debug views
- Auth: founder-only via dashboard_founders allowlist, magic link + device trust
- Status: public gets simplified view, founder gets full detail
- Light mode: eventually, dark-first initially

## Note

Docs 02-07 will be committed in a follow-up batch commit to this branch.
Doc 01 (reconciliation) and Doc 08 (roadmap) are committed here as the two most critical references.
