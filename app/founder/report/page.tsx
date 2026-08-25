import { redirect } from 'next/navigation'

// RETIRED 2026-08-25.
//
// This route held an ~11 KB string constant — a one-off certification
// reconciliation dated 15 June 2026, marked `dynamic = 'force-static'`. It was
// reachable from no navigation anywhere in the app: not SIDEBAR_NAV, not
// BOTTOM_NAV, not the CONSOLE_LINKS list on /founder/more. A snapshot of a
// moment, shipped as a permanent route, and then forgotten.
//
// Redirected rather than deleted so any bookmark or old link still lands
// somewhere sensible instead of a 404. The document itself is not lost — it is
// in this file's git history at the commit before this one.
export default function RetiredReportPage() {
  redirect('/founder')
}
