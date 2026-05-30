import { type CookieOptions } from '@supabase/ssr'

/**
 * Shared cookie options for ALL @supabase/ssr clients (browser, server,
 * middleware) so the founder auth cookie is a PERSISTENT cookie rather than a
 * session cookie.
 *
 * Root cause (F.2B): none of the three clients set an explicit maxAge, so the
 * auth cookie was session-scoped and dropped when the Android browser / installed
 * PWA fully closed — forcing a fresh login on every cold start. Measured: 9 new
 * auth.sessions in 7 days for one founder, with server-side sessions non-expiring
 * (not_after = NULL) and refresh-token rotation healthy. So the fault was purely
 * client-side cookie lifetime.
 *
 * maxAge 400 days = Chrome's maximum persistent cookie lifetime.
 * httpOnly is intentionally NOT set: the browser client must read these cookies
 * via document.cookie to hydrate the session. secure is gated to production so
 * local http dev still works.
 *
 * IMPORTANT: pass this identical object to every @supabase/ssr client creation
 * so cookies never fragment across clients.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 400,
}
