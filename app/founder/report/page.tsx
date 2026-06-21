import { CopyReportButton } from './copy-report-button'

export const metadata = { title: 'Visibility Report' }
export const dynamic = 'force-static'

// Reconciliation deliverable. The same REPORT_TEXT string is both rendered
// on the page and handed to the Copy button, so the copied content is
// byte-identical to what the founder sees. Additive route — no existing
// page or nav is modified.

const REPORT_TEXT = `FOUNDER VISIBILITY REPORT — CERTIFICATION RECONCILIATION
pranixailabs.com · 2026-06-15 · read-only · reconciliation thread
Conclusion labels: PROVEN / PARTIALLY PROVEN / UNPROVEN / CONFLICTING EVIDENCE

====================================================================
EXECUTIVE SUMMARY
====================================================================
The 7 certification artifacts (T3 Accountant, T5 Mobile, T6 Report Card,
EdGridAI Teacher, EdGridAI Parent, EdGridAI Student, BR-02 Replay) are now
FOUNDER-VISIBLE and DURABLE on exactly one surface: Artifact Governance
(Overview > Artifacts > Pending review). [PROVEN]

The other founder surfaces are unreliable for locating certifications:
- Evidence feed shows only the newest 60 browser artifacts (a moving window);
  T5 Mobile has already aged out, the rest are near the cutoff. [PROVEN]
- Browser Intelligence (Visual Regression) shows only fail/review items, so the
  6 passing cert runs are excluded by design; only BR-02 appears. [PROVEN]
- BR-02 is visible but NOT playable from the founder dashboard, and its
  thumbnail renders broken because it is a JSON session, not an image. [PROVEN]

Net: the founder CAN independently locate every certification artifact via
Artifact Governance. Success condition for location is MET on that surface.
BR-02 in-dashboard playback remains BLOCKED.

====================================================================
PROVEN FACTS
====================================================================
PF1 [PROVEN | E1,E2] All 7 cert artifacts exist as governance_record rows in
    artifact_registry and appear in Artifact Governance > Pending review with
    Reviewed/Canonical/Archive/Purge controls. Runs: schoolos 85aafaea (T6, 3
    records), 66c6685a (T3, 2), 2143fc49 (T5, 2), fbdeec11 (BR-02, 1); vidyagrid
    4eb9753a (Teacher, 3), f9826efd (Parent, 3), 44d1384f (Student, 3).
PF2 [PROVEN | E1] evidence_registry (a VIEW over artifact_registry) reflects all
    7 automatically — same underlying data.
PF3 [PROVEN | E3,E4,E8] Evidence feed = newest 60 browser_artifacts (moving
    window). Live positions: Teacher 8, Student 11, Parent 14, T6 49, BR-02 53,
    T3 55 (all still in top 60), T5 Mobile 64 = AGED OUT / not visible.
PF4 [PROVEN | E6,E7] Browser Intelligence (Visual Regression) query filters
    status IN (fail, review). The 6 passing cert runs never appear. Only BR-02
    (status review) is listed.
PF5 [PROVEN | E5,E6,E7,E8] BR-02 artifact 034ba90d has artifact_type
    human_session_replay and storage_path
    human-sessions/schoolos/accountant/cert_synthetic_001.json. Surfaces render
    storage_path as an <img>, so a .json file shows a broken thumbnail.
PF6 [PROVEN | E10] The dashboard "View Replay" reconstructs AGENT-TASK execution
    from execution_memory keyed by task_id; it is not a player for a
    human_session_replay session file.

====================================================================
CONFLICTS
====================================================================
C1 [CONFLICTING EVIDENCE — RESOLVED | prior phase vs E3,E4]
   A prior phase reported the 7 as "visible in Test Evidence." Current evidence
   shows T5 is absent and the others sit near the 60-row cutoff. Both are
   explained by the moving newest-60 window: the earlier claim was true at its
   capture time but is recency-fragile. Resolution: Test Evidence is NOT a
   reliable certification-location surface. No factual contradiction.
C2 [CONFLICTING EVIDENCE — NOTED | E2 vs E6]
   BR-02 is simultaneously "active/visible" in Artifact Governance (E2) and
   "broken thumbnail / awaiting baseline" in Browser Intelligence (E6). Not a
   data conflict — it is the same row presented by two renderers, one of which
   mishandles the non-image type (see RC3).

====================================================================
ROOT CAUSES
====================================================================
RC1 [PROVEN | E8] Evidence feed has a hard newest-60 limit and no certification
    pin/filter, so cert artifacts age out as new crawls are captured.
RC2 [PROVEN | E7] Browser Intelligence is scoped to visual regressions
    (status fail/review) by design; passes are intentionally excluded.
RC3 [PROVEN | E6,E7,E8] Thumbnail renderers assume every storage_path is an
    image; a human_session_replay (.json) yields a broken <img>.
RC4 [PARTIALLY PROVEN | E10] No founder-dashboard component maps
    human_session_replay to a player; the only replay UI targets agent-task
    execution. A full file-by-file search of the dashboard was not performed, so
    a hidden player cannot be 100% excluded.

====================================================================
FOUNDER ACTIONS (no code)
====================================================================
FA1 To locate ANY certification: Overview > Artifacts > Pending review. All 7
    are there, permanently. [Basis: PF1]
FA2 To accept an agent-generated cert as founder-reviewed: tap "Reviewed" on
    each entry. The agent did NOT self-approve (founder_reviewed left false by
    policy). [Basis: PF1]
FA3 Do NOT use Evidence or Browser Intelligence to find passing certifications —
    Evidence ages them out, Browser Intelligence hides passes. [Basis: PF3,PF4]
FA4 Merge PR #53 (migration 014) to keep FUTURE browser runs auto-appearing in
    the vault. [Basis: E12]
FA5 Merge the COPY REPORT PR (this deliverable) for one-click report copy.

====================================================================
DEVELOPER ACTIONS (small, additive — NOT performed in this thread)
====================================================================
DA1 [read-layer] Add a certification pin/filter to the Evidence query so cert
    runs do not age out (union newest-60 with category='browser_evidence').
DA2 [read-layer] Guard the thumbnail renderer: if artifact_type =
    human_session_replay (or storage_path ends in .json), render a "Play replay"
    link instead of <img>.
DA3 [read-layer, depends on engine health] Link human_session_replay artifacts
    to the existing engine player /api/br02-replay?artifact_id= from Browser
    Intelligence / Artifacts.
DA0 [OBSERVED, OUT OF SCOPE] Operations shows pranix-agent-engine /api/mcp
    returning 500 (SyntaxError api/mcp.js:2305). Flagged only; not investigated
    per thread scope. DA3 viability depends on engine health.

====================================================================
DONE
====================================================================
| Item                                              | Status | Evidence |
| Auto-promotion browser_artifacts -> registry (014)| DONE   | E12      |
| 7 cert artifacts durable in Artifact Governance   | DONE   | E1,E2    |
| evidence_registry view reflects all 7             | DONE   | E1       |

====================================================================
BLOCKED
====================================================================
| Item                              | Reason                          | Refs    |
| BR-02 in-dashboard playback       | No player surface (RC4) +       | E10,E11 |
|                                   | engine health out of scope      |         |

====================================================================
PENDING (founder decision/action)
====================================================================
| Item                                       | Owner   | Refs   |
| Review/accept the 7 (tap "Reviewed")       | Founder | PF1    |
| Merge PR #53 (migration 014 provenance)    | Founder | E12    |
| Merge COPY REPORT PR                        | Founder | FA5    |
| Authorize dev phase for DA1-DA3 (optional) | Founder | DA1-3  |

====================================================================
EVIDENCE REFERENCES
====================================================================
E1  Live control_plane_read (2026-06-15): artifact_registry pending-review =
    7 engine-promoted browser runs, founder_reviewed=false, status active.
E2  Founder screenshot — Artifact Governance (17:04 IST): 7 browser-run entries
    in Pending review; "81 governed entries"; governance_record 18 entries.
E3  Live control_plane_read: Evidence-feed positions (newer_rows_ahead) —
    Teacher 8, Student 11, Parent 14, T6 49, BR-02 53, T3 55, T5 64 (aged out).
E4  Founder screenshot — Evidence (17:03 IST): top of feed = pranix_site
    founder_* screenshots; "Screenshots (60)".
E5  Live control_plane_read: BR-02 034ba90d type=human_session_replay,
    storage_path=human-sessions/schoolos/accountant/cert_synthetic_001.json,
    status=review.
E6  Founder screenshot — Visual Regression (17:04 IST): Failing (0); Awaiting
    review (50) includes schoolos/accountant_fee_collection_replay (034ba90d)
    with a broken image.
E7  Code: app/founder/baselines/page.tsx + lib/queries getReviewArtifacts —
    status IN (fail,review); storage_path rendered as <img>.
E8  Code: app/founder/evidence/page.tsx + getEvidenceArtifacts(60) — newest 60
    browser_artifacts; rendered as <img>/<video>.
E9  Code: app/founder/artifacts/page.tsx + lib/artifacts getArtifactGovernance —
    reads artifact_registry; pendingReview = !founder_reviewed AND status IN
    (draft,active).
E10 Code: app/api/founder/replay/route.ts + approvals/view-replay-button.tsx —
    replay = agent-task execution reconstruction from execution_memory by
    task_id; not a human_session_replay player.
E11 Founder screenshot — Operations (17:05 IST): deployment diagnostics show
    pranix-agent-engine /api/mcp 500 SyntaxError api/mcp.js:2305. Observed only.
E12 migration 014 (PR #53, pranix-agent-engine): browser_artifacts ->
    artifact_registry auto-promotion trigger; applied live in a prior phase.

END OF REPORT`

export default function VisibilityReportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg-primary">Founder Visibility Report</h1>
          <p className="mt-1 text-[13px] text-fg-muted">Certification reconciliation · 2026-06-15 · read-only</p>
        </div>
        <CopyReportButton text={REPORT_TEXT} />
      </div>

      <pre className="whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-surface p-4 font-mono text-[12px] leading-relaxed text-fg-secondary">{REPORT_TEXT}</pre>
    </div>
  )
}
