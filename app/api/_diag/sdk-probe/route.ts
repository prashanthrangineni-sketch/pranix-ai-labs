import { createServerClient } from '@/lib/supabase'

// TEMPORARY F.2C SDK-validation probe. Removed before the feature PR.
// Purpose:
//  (1) Compile gate — the guarded block below is type-checked by `next build`
//      and proves `auth.mfa.enroll({ factorType: 'webauthn' })` exists in the
//      resolved @supabase SDK types. It never executes (no runtime side effect).
//  (2) Runtime read — best-effort report of the resolved package versions so we
//      can pin them explicitly.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function resolvedVersion(pkg: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs') as typeof import('node:fs')
    const path = require('node:path') as typeof import('node:path')
    const p = path.join(process.cwd(), 'node_modules', pkg, 'package.json')
    return JSON.parse(fs.readFileSync(p, 'utf8')).version as string
  } catch {
    return 'unknown'
  }
}

export async function GET() {
  // (1) Compile-only. Guarded so it never runs. Still fully type-checked.
  if (false as boolean) {
    const supabase = createServerClient()
    await supabase.auth.mfa.enroll({ factorType: 'webauthn' })
  }

  // (2) Runtime versions (best-effort).
  return Response.json({
    probe: 'f2c-sdk',
    supabase_js: resolvedVersion('@supabase/supabase-js'),
    auth_js: resolvedVersion('@supabase/auth-js'),
    ssr: resolvedVersion('@supabase/ssr'),
  })
}
