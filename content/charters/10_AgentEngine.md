# Pranix Agent Engine (Tau) — Product Charter (2026-07-17)

## WHAT IT IS
The 24/7 backbone: MCP gateway (70+ tools), control plane (tasks/missions/outcome checks/alerts), Tau dispatcher, Deploy Guardian, guardian sweep, free-provider inference router. Every other product's automation runs through it.

## WHAT THE FOUNDER NEEDS NOW
1. Nothing to unblock the spine — Tau dispatcher is LIVE (verified this morning, run #8 green after you added the GH secrets)
2. Approve the founder-gated cleanup for the protocol-violation alert storm: one duplicate "constitutional" memory row (id 4091) has fired an alert every 15–30 min since June 14 — 4,734 alerts total (details + dedup proposal in Alert_RootCause_Report.md)
3. Add checks:read/Actions:read to the PranixQuick PAT (2 min) — today deploy-guardian cannot see open PRs on ANY PranixQuick repo (verified: its findings cover only the sketch account)
4. Approve the two broken gateway Vercel tools fix when the PR is raised

## LIVE-VERIFIED STATE (control plane, read 2026-07-17 ~03:30Z)
- tau-dispatcher heartbeat **LIVE**: "loop finished" 03:12:55Z, idle · deploy_guardian **WORKING** 03:30:21Z (scanned 8 repos)
- tau-dispatcher.yml + guardian-sweep.yml merged and on main (PR #71, merge 99e1f5a) — VERIFIED via repo tree
- Workflow-failure alerts (tau ×7, guardian ×5) all predate the 08:45 IST secrets fix; none since 02:11Z
- outcome-check probes honest & scoped on main (quickscanz ×3, cart2save ×2); merchant_routing wrong-table bug FIXED on main, passing
- Alert storm: verify_protocols() double-scheduled (pg_cron jobs 36 + 37) with zero dedup — 288 alerts/48h, root cause verified in function source

## NEXT 3
1. Apply the alert dedup rule + retire the stale expected-5 constitutional invariant (founder-gated SQL)
2. 7-day dispatcher parallel-run phase (#188): prove tasks complete laptop-closed
3. GlitchTip error monitoring + the self-healing loop (detect → agent PR → verify → one-tap merge)
