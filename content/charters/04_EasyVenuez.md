# EasyVenuez — Product Charter (2026-07-17)

## WHAT IT IS
Venue-booking marketplace (newest build, July 8): search, booking, Razorpay payments, verified-partner badges, host dashboard. Deployed on Vercel; payments blocked on founder-side env/unblock.

## WHAT THE FOUNDER NEEDS NOW
1. Clear the Vercel BLOCKED state on PR previews (deployment protection — only the account owner can)
2. Add the 3 Razorpay env vars in Vercel
3. Merge PR #3 (Razorpay rework + badges + review prompts — code line-verified earlier, held)
4. One test booking as witness after merge

## LIVE-VERIFIED STATE (control plane, read 2026-07-17 ~03:30Z)
- outcome_checks: **NONE DEFINED** for easyvenuez — the product has zero automated health coverage (verified: no rows)
- Repo PranixQuick/easyvenuez active in product_repos registry; NOT in deploy-guardian's watched-repo list → PR #3 status not independently verifiable from the control plane today (its "held/green" status is CLAIMED from the 07-16 Execution Structure)
- easyvenuez cron sweep 401 alerts ×2 in last 48h (phase_f monitor) — deploy protection blocking automated checks, consistent with founder-queue item

## NEXT 3
1. Define outcome_checks (booking_flow, payment, partner_onboarding) + add repo to guardian watch list
2. "Total Price Lock" itemized quote engine (attacks the category's #1 complaint)
3. UPI Reserve Pay milestone payments (NPCI Jan 2026 rails; early-mover slot)
