# 06 — Mobile & APK Strategy

## Phase 1: PWA (Current)

The founder dashboard ships as a Progressive Web App first. No native APK in Phase 1.

### Why PWA first
- Founder is already on Android — PWA installs from Chrome with zero friction
- No app store review cycle for infra tooling updates
- Service worker gives offline cache for last-known state
- Push notifications via VAPID (Web Push) without Firebase dependency

### PWA Configuration
- `manifest.json` with `display: standalone`, `theme_color` matching canvas
- Service worker via Workbox (next-pwa or manual)
- Icons: 192px + 512px maskable
- `start_url: /founder`
- `scope: /founder/`

### Offline Strategy
- Workbox runtime caching: StaleWhileRevalidate for data reads
- Cache-first for static assets (CSS, JS, fonts)
- Background sync for offline mutations (queued approvals)
- Persistent "offline — showing cached" banner when disconnected

### Push Notifications (VAPID)
- Server generates VAPID key pair
- Browser subscribes and sends endpoint to `founder_push_subscriptions` table
- Edge function sends notifications for critical alerts
- No Firebase, no OneSignal — direct Web Push API

---

## Phase 2: TWA (Trusted Web Activity)

Wrap the PWA in a TWA for Play Store presence. Same codebase, native chrome.

- Bubblewrap CLI for APK generation
- Digital Asset Links for URL verification
- Same service worker, same offline strategy
- Play Store listing for discoverability

---

## Phase 3: Capacitor (Deferred)

Only if native APIs are needed (background location, NFC, etc.). Not planned.

---

## Mobile-First Design Constraints

- Bottom nav within thumb reach zone (bottom 60% of screen)
- Safe area insets for Android gesture nav
- 56dp minimum row height
- Pull-to-refresh on all list views
- No hover-dependent interactions
- Touch targets >= 48dp
- Viewport: 412x915 (Pixel 7 class) as primary design target
