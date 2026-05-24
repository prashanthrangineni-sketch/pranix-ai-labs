# 03 — UX Strategy

> **A calm mission-control layer for sovereign AI-assisted execution.**

The founder dashboard is judged not by how much it shows, but by how quickly it lets the founder act on what matters and ignore what doesn't.

---

## 1. The Founder's Operating Reality

- Android phone, one-handed, often mid-conversation or in transit
- Intermittent connectivity (mobile data, sometimes Wi-Fi)
- Approval-checkpoint-driven workflow
- Non-developer execution — instructions go to MCP tools, not to a terminal
- Async by nature — work is queued, runs in background, gets reviewed later

Design implications: one-thumb reachability, glanceable state, approval-grade UX, offline tolerance, async honesty.

---

## 2. The Calm Principle

The dashboard reduces operational anxiety. It does not amplify it.

| Anti-pattern | Pattern |
|---|---|
| Red badges everywhere | One numeric badge on bottom nav for critical-only |
| Real-time ticker animations | Refresh on focus + pull-to-refresh + "last updated 32s ago" |
| Toast spam | Toasts only for completed user actions |
| 4,583 raw alerts in a list | Top 5 patterns grouped by source; raw alerts behind a tap |
| Color-coded everything | Color used only for severity; everything else monochrome |

---

## 3. Information Density

- Row height: minimum 56dp tap target, 16dp internal padding
- Vertical rhythm: 4dp base grid; spacing units = {4, 8, 12, 16, 24, 32, 48}
- Maximum 7 items visible above fold on Pixel 7 class device

## 4. Reading Patterns

| Surface | Pattern | Implication |
|---|---|---|
| `/founder/overview` | Triage | Top-to-bottom severity sort |
| `/founder/tasks` | Scan | Dense table, sticky filter bar |
| `/founder/alerts` | Group | Default = patterns view |
| `/founder/workers` | Pulse | Heartbeat-style cards, recency dominant |
| `/founder/memory` | Browse | Key-prefix tree with value preview |
| `/founder/orchestrate` | Compose | Chat-like input + provider picker |
| `/founder/approvals` | Decide | Single primary action per row |

## 5. Touch Targets

- All taps >= 48dp
- Pull-to-refresh on every list surface
- No swipe carousels, no drag-to-reorder
- Pinch-zoom only inside DAG visualization

## 6. Approval-Grade Interaction

Every mutating action: Tap -> confirmation bottom sheet -> primary action button. No two-tap-without-context shortcuts.

## 7. Freshness Honesty

Every data surface shows last-fetched time and a stale threshold. Connection-lost: service worker cache with "offline" banner.

## 8. Color Semantics

Color is exclusively for severity and state. Saturation stays low. No neon.

| Hue | Meaning |
|---|---|
| Accent (cool blue) | Brand, primary actions |
| Amber | Warning, degraded, stale |
| Red (desaturated) | Critical, dead, error |
| Green (desaturated) | Healthy, completed |

## 9. Empty States

| Pattern | When |
|---|---|
| Not yet active | Surface configured but no data (inference_log) |
| Sparse | Some data, historically incomplete (task_events) |
| Quiet | Genuinely empty in a good way (no pending approvals) |
| Deferred | Depends on infra not yet deployed (browser artifacts) |

Never use illustrations for empty states. Words.

## 10. Motion

Motion exists to confirm causation, not to delight. 200ms ease-out transitions. No looping animations, no parallax. `prefers-reduced-motion` respected.

## 11. Latency Budgets

| Action | Budget |
|---|---|
| Overview first paint | <800ms |
| Overview interactive | <1500ms |
| Tap into list row | <100ms |
| Pull-to-refresh | <600ms |
| Approve grant | <400ms perceived |

## 12. Accessibility

WCAG AA contrast minimums. Visible focus rings. Screen reader landmarks. No color-only indicators. 48dp tap targets.

## 13. Founder Voice / Tone

No marketing. No false certainty. Founder addresses founder.

- "Deployment ready. 02:14" not "Deployment successful!"
- "Read failed. Tap to retry." not "Oops! Something went wrong"
- "Routing to Claude. Expected ~12s" not "AI Magic in Progress"
