# QuietKeep — Product Charter (2026-07-17)

## WHAT IT IS
Voice-first notes and reminders app: speak a note, get it transcribed, searchable, and turned into dated reminders. Its entire value proposition IS voice — and all three voice checks are degraded.

## WHAT THE FOUNDER NEEDS NOW
1. Paste the Sarvam API key (founder queue) — the voice pipeline upgrades hang on it
2. Paste SUPABASE_QUIETKEEP_SERVICE_ROLE_KEY (missing-secret alerts ×2 in 48h)
3. Approve prioritizing the 3 degraded voice checks over any new feature
4. Submit the Sarvam Startup Program form (free credits, 5 minutes)

## LIVE-VERIFIED STATE (control-plane outcome_checks, read 2026-07-17 ~03:30Z)
- reminder_delivery **PASS** (reminders=8) · search_retrieval **PASS** (keeps=154) — 07-16
- voice_capture **DEGRADED** (voice_samples=0) · stt_quality **DEGRADED** (voice_sessions=0) · tts_quality **DEGRADED** (qk_messages=0) — 07-16, human-in-loop rows
- Reading: storage/search of existing notes works; NO evidence any voice has ever flowed through capture→STT→TTS in prod. Core loop unproven, VERIFIED.

## NEXT 3
1. Fix capture→STT→TTS end-to-end and make the three checks pass with real sessions
2. Hinglish/Telugu-English code-mixed capture via Sarvam (category exclusive)
3. Speak-a-reminder agent ("Ravi ko Friday paise wapas karne hain" → dated reminder + WhatsApp nudge)
