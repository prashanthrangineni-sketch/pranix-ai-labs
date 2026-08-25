import { redirect } from 'next/navigation'

// RETIRED 2026-08-25.
//
// This page carried its own banner: "AI management is consolidating into the
// AI Workspace". It said so, and then rendered the old interface underneath
// anyway, and stayed linked from /founder/more — where CONSOLE_LINKS labelled
// it "AI Workspace", the same label SIDEBAR_NAV gives /founder/workspace. Two
// routes, one name, one of them superseded.
//
// A deprecation banner is a promise. This keeps it: the route now goes where
// the banner always said it would.
export default function RetiredAiPage() {
  redirect('/founder/workspace')
}
