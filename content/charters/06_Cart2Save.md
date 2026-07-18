# Cart2Save — Product Charter (2026-07-17)

## WHAT IT IS
Cashback/deals platform (cart2save.com): product search, price comparison, affiliate routing to merchants, cashback tracking. Live and earning partially — affiliate routing works, cashback tracking doesn't.

## WHAT THE FOUNDER NEEDS NOW
1. Rotate the stale secrets (#7/#52 — July-4 leak checklist, overdue, founder-only)
2. Paste SUPABASE_CART2SAVE_SERVICE_ROLE_KEY where the cron monitor says it's missing (2 alerts in 48h)
3. Nothing on merchant_routing — it is FIXED and passing (see below); task #181 can be closed
4. Approve investigation task for cashback_tracking (0 events ever recorded — the real revenue leak)

## LIVE-VERIFIED STATE (control-plane outcome_checks, read 2026-07-17 ~03:30Z)
- merchant_routing **PASS** (probe count=78 from service_rate_cards, 03:13Z today) — T6 read lib/handlers/outcome-checks.js on agent-engine MAIN: probe already reads `service_rate_cards`. The "fix stuck in local folder" premise of task #181 is STALE — the correction is live and passing. VERIFIED, no patch needed.
- affiliate_routing **PASS** (clicks=44) · comparison **PASS** (cards=1731) · search **PASS** (10)
- cashback_tracking **DEGRADED** (cashback_events=0, 07-16) — uninvestigated; distinct from #181
- This remains the "quietly broken in production" product only via cashback_tracking now

## NEXT 3
1. Root-cause cashback_tracking=0 (is the postback/webhook from affiliate networks ever firing?)
2. Tracking-proof receipts (click-chain evidence users can show when cashback is denied)
3. Cashback SLA scoreboard from our own confirmation data
