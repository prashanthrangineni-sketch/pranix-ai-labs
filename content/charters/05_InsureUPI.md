# InsureUPI — Product Charter (2026-07-17)

## WHAT IT IS
Insurance DSA/partner platform (newest build, July 8) for India's PoSP/partner channel: partner scoping, commission visibility, UPI-payout positioning. Deployed; the security-critical partner-scoping fix awaits founder merge.

## WHAT THE FOUNDER NEEDS NOW
1. Merge PR #18 — this IS the founder-gated RLS activation (partner-scoping migration + policies, line-verified earlier)
2. Log in once as a partner after merge (witness step)
3. Nothing else until then — everything downstream assumes #18 is live

## LIVE-VERIFIED STATE (control plane, read 2026-07-17 ~03:30Z)
- outcome_checks: **NONE DEFINED** for insureupi (verified: no rows) — zero automated health coverage
- Repo PranixQuick/insureupi active in registry; NOT guardian-watched → PR #18 held status is CLAIMED (07-16 Execution Structure), not independently re-verified today
- insureupi cron sweep 401 alerts ×2 in last 48h — automated sweeps can't authenticate, same credential-drift family as founder queue

## NEXT 3
1. Define outcome_checks (partner_login, policy_pipeline, commission_ledger) + guardian watch
2. Real-time commission ledger with weekly/instant UPI payout (counters the industry's #1 partner complaint)
3. AI voice renewal agent for persistency (directly monetizes the Feb 2026 IRDAI commission-quality rules)
