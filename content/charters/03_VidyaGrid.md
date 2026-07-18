# VidyaGrid (EdGridAI) — Product Charter (2026-07-17)

## WHAT IT IS
Learning content + video engine built on a prerequisite knowledge graph: Class 10 content complete, KG-PG graph growing (Perplexity-run), working MP4 video-generation pipeline, student/parent/teacher journeys live.

## WHAT THE FOUNDER NEEDS NOW
1. Approve grant 47fdb2ce so the `fix/video-generation-storage` branch finally becomes a PR (video UI works only on localhost until merged)
2. After merge: open the live "generated videos" page once as witness
3. Nothing else — teacher-journey fix and reels pipeline ride on agents

## LIVE-VERIFIED STATE (control-plane outcome_checks, read 2026-07-17 ~03:30Z)
- student_journey **PASS** (exam_sessions=2) · parent_journey **PASS** (report_events=1) — 07-16
- teacher_journey **DEGRADED** (teacher_interventions=0) — 07-16
- 511 questions in prod (≥408 baseline), verified live by ocean-supervisor today 03:04Z; 0 open PRs, 133 closed
- Video pipeline: real MP4s produced (CLAIMED in Execution Structure; production storage fix still unmerged — VERIFIED blocked on grant 47fdb2ce)

## NEXT 3
1. Auto-generated Telugu+English vertical reels per KG node (doubles as the marketing engine's first workload)
2. "Learning X-ray" prerequisite-gap diagnosis report for parents
3. WhatsApp daily-drill bot (3 adaptive questions/day, wrong answer → matching 60-second reel)
