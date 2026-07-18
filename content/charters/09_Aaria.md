# Pranix Aaria — Product Charter (2026-07-17)

## WHAT IT IS
The shared voice engine behind every product: Telugu-first TTS/STT/NLU served from pranix-aaria (Render), integrated into QuickScanZ, School-OS, VidyaGrid, Cart2Save and QuietKeep. An enabler, not a consumer product — its health is measured through its host products.

## WHAT THE FOUNDER NEEDS NOW
1. Paste the Sarvam API key (blocks the Bulbul V3 upgrade path)
2. Submit the Sarvam Startup Program application (6–12 months free credits — free money, 5-minute form)
3. Approve merge of School-OS PR #297 (Aaria voice-companion route, verified green today)
4. Bhashini key when the external process yields it

## LIVE-VERIFIED STATE (control plane, read 2026-07-17 ~03:30Z)
- No outcome_checks of its own (verified: no rows) — Aaria's live signal is its host products:
- QuietKeep voice checks all **DEGRADED** (capture/STT/TTS = 0 events) — the loudest Aaria gap in prod
- QuickScanZ/VidyaGrid/School-OS journeys that embed Aaria **PASS** (07-16 rows)
- aaria-keepalive cron pings every 5 min from agent-engine (vercel.json, verified on main) — Render cold-start mitigation is real
- Native QuickScanZ calls Aaria unauthenticated over HTTPS with text-only payloads (verified in code) — fine for now, flagged in the Play data-safety kit

## NEXT 3
1. Make QuietKeep's three voice checks pass (first real end-to-end Aaria proof in prod)
2. Sarvam Bulbul V3 + Pipecat/LiveKit pipeline (replaces hand-rolled voice loop)
3. "Telugu TalkBack for web apps" drop-in SDK with ON/OFF toggle — build once, every product inherits; potential standalone product
