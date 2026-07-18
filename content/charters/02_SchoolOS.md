# School-OS (EdProSys) — Product Charter (2026-07-17)

## WHAT IT IS
Multi-tenant school management platform for Indian budget schools (schoolos.in): admissions, attendance, fees/UPI, report cards, Telugu-first voice via Aaria. Cleanest engineering in the portfolio; zero customers through any pipeline yet.

## WHAT THE FOUNDER NEEDS NOW
1. Merge PR #297 (Aaria voice-companion route — independently re-verified ready by ocean-supervisor today)
2. Decide the first-10-schools outreach plan — task #15 is designed but zero schools contacted; this product needs customers, not code
3. Founder-to-school conversation on the adoption gap: daily attendance marking is genuinely unused (T4 finding), fees genuinely used
4. Approve the queued voice/WhatsApp absent-only attendance feature (the fix for that adoption gap)

## LIVE-VERIFIED STATE (control-plane outcome_checks, read 2026-07-17 ~03:30Z)
- All 5 journeys **PASS**: principal (briefings=9) · teacher (attendance=21) · parent (consent=1) · registrar (students=424) · accountant (payments=8) — checked 07-16
- Open PR #297 re-verified live today 03:04Z (ocean-supervisor heartbeat): 5 checks green, Vercel preview Ready, additive single file — founder gate only
- T4 CLOSED (07-16, vs live DB): "0 attendance" = adoption gap, not broken code; fee collection 21% is real usage
- Outreach: docs/outreach absent in repo (file_count 0) — #15 not started, VERIFIED

## NEXT 3
1. WhatsApp-native parent flows (enquiry → fee UPI link → report card, replies-free window architecture)
2. Fee-default early-warning + soft-collection agent (the ₹ pain that sells to tier-2/3 schools)
3. AI-drafted NEP Holistic Progress Cards from teacher voice notes (CBSE HPC purchase driver)
