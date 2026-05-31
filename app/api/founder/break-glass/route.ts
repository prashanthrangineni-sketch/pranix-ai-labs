import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual, randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import { requireWritableFounder } from '@/lib/auth'

// Founder Password Administration — Admin-API based, NO email / magic-link / PKCE.
//
// Mode 1 (action: 'set_secret'): a logged-in founder stores a recovery secret
//   (only its SHA-256 is persisted). Used later if they are locked out.
// Mode 2 (default): break-glass reset. Anyone with the founder email + recovery
//   secret can set a new password via the service-role Admin API. No session,
//   no email, no rate-limited delivery. 5 wrong tries → 15-min lockout.

function sha256hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

type DB = ReturnType<typeof getControlPlane>

async function callerFounderEmail(): Promise<string | null> {
  try {
    const auth = createServerClient()
    const { data } = await auth.auth.getUser()
    const email = data.user?.email ?? null
    if (!email) return null
    const { data: f } = await auth
      .from('dashboard_founders')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    return f ? email : null
  } catch {
    return null
  }
}

async function findFounderUserId(db: DB, email: string): Promise<string | null> {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data) return null
    const u = data.users.find((x: { email?: string }) => (x.email || '').toLowerCase() === email)
    if (u) return u.id
    if (data.users.length < 200) break
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body?.action
  const db = getControlPlane()

  // ── Mode 1: set recovery secret (session-gated) ──
  if (action === 'set_secret') {
    const caller = await callerFounderEmail()
    if (!caller) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const secret = String(body?.secret ?? '')
    if (secret.length < 8) {
      return NextResponse.json({ error: 'Recovery secret must be at least 8 characters.' }, { status: 400 })
    }
    const { error } = await db.from('founder_break_glass').upsert(
      {
        email: caller,
        secret_sha256: sha256hex(secret),
        updated_at: new Date().toISOString(),
        failed_attempts: 0,
        locked_until: null,
      },
      { onConflict: 'email' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mode: 'set_secret', email: caller })
  }

  // ── Mode 2: break-glass reset (public, secret-gated) ──
  const email = String(body?.email ?? '').toLowerCase().trim()
  const secret = String(body?.secret ?? '')
  const newPassword = String(body?.new_password ?? '')
  if (!email || !secret || !newPassword) {
    return NextResponse.json({ error: 'email, secret and new_password are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const { data: founder } = await db
    .from('dashboard_founders')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  if (!founder) return NextResponse.json({ error: 'Not a founder account.' }, { status: 403 })

  const { data: bg } = await db
    .from('founder_break_glass')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (!bg) {
    return NextResponse.json(
      { error: 'No recovery secret is set for this account yet. Sign in and set one on the Account page first.' },
      { status: 400 },
    )
  }

  if (bg.locked_until && new Date(bg.locked_until) > new Date()) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
  }

  if (!safeEqualHex(sha256hex(secret), bg.secret_sha256)) {
    const fails = (bg.failed_attempts || 0) + 1
    const locked = fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
    await db.from('founder_break_glass').update({ failed_attempts: fails, locked_until: locked }).eq('email', email)
    try {
      await db.from('mcp_audit_logs').insert({
        client_name: email,
        tool_name: 'founder_ui:break_glass_fail',
        scope_used: 'public',
        resource: `auth.users:${email}`,
        status_code: 401,
        request_id: randomUUID(),
      } as never)
    } catch {}
    return NextResponse.json({ error: 'Incorrect recovery secret.' }, { status: 401 })
  }

  const userId = await findFounderUserId(db, email)
  if (!userId) return NextResponse.json({ error: 'Auth user not found for this email.' }, { status: 404 })

  const { error: updErr } = await db.auth.admin.updateUserById(userId, {
    password: newPassword,
    email_confirm: true,
  })
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await db
    .from('founder_break_glass')
    .update({
      uses: (bg.uses || 0) + 1,
      last_used_at: new Date().toISOString(),
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('email', email)
  try {
    await db.from('mcp_audit_logs').insert({
      client_name: email,
      tool_name: 'founder_ui:break_glass_reset',
      scope_used: 'admin',
      resource: `auth.users:${email}`,
      status_code: 200,
      request_id: randomUUID(),
    } as never)
  } catch {}

  return NextResponse.json({ ok: true, mode: 'reset', email })
}
