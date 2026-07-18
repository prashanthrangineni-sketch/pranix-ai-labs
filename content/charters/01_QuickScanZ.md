# QuickScanZ — Product Charter (2026-07-17)

## WHAT IT IS
Warranty/receipt scanner for Indian consumers: scan any bill, get warranty tracking, expiry reminders, claim help and a family vault — web (quickscanz.com) plus a native Android app ready for Play Store. Multilingual (EN/TE/HI/TA/KN/ML) with Aaria voice built in.

## WHAT THE FOUNDER NEEDS NOW
1. Merge PR #85 (native app fixes, was green & held)
2. Set EAS env vars: Supabase URL + anon key (required since the security fix)
3. Play Console signup ($25) + upload using the ready keystore — the kit in playstore_kit/ has listing, data-safety answers, policy, shot-list
4. Finish on-device walkthrough of the 11 findings on the OPPO (T3 round in progress)
5. Nothing else technical — this is the closest product to market

## LIVE-VERIFIED STATE (control-plane outcome_checks, read 2026-07-17 ~03:30Z)
- warranty_storage **PASS** (probe count=21, 03:13Z) · warranty_retrieval **PASS** (21) · reminder_delivery **PASS** (1)
- ocr_accuracy **PASS** (human-in-loop, claim_sessions=4, 07-16)
- camera_capture **DEGRADED** — row is STALE: old probe read the wrong table (device_service_logs=0); that probe no longer exists on agent-engine main. Real camera status = T3's on-device walkthrough, not this row.
- Play Store presence: none (the gap). Web live & auto-monitored.

## NEXT 3
1. Play Store submission (kit → founder upload)
2. Fix the two live-test findings (greeting-once, TTS overlap — task #183) + remove unused RECORD_AUDIO permission before release build
3. Post-launch: installation-date guardian + DPDP consent/export badges (roadmap "Now" items)
