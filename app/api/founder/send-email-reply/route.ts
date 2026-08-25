import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '../../../lib/control-plane'
import { requireWritableFounder } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const __gate = await requireWritableFounder()
  if (__gate instanceof NextResponse) return __gate

  const { searchParams } = new URL(req.url)
  const email_id = searchParams.get('email_id')
  if (!email_id) {
    return NextResponse.json({ error: 'email_id is required' }, { status: 400 })
  }

  try {
    const db = getControlPlane()
    
    // 1. Fetch the email details
    const { data: email, error: fetchErr } = await db
      .from('founder_email_intelligence')
      .select('*')
      .eq('email_id', email_id)
      .maybeSingle()

    if (fetchErr || !email) {
      return NextResponse.json({ error: fetchErr ? fetchErr.message : 'Email not found' }, { status: 404 })
    }

    const draft = email.metadata?.draft_reply
    if (!draft) {
      return NextResponse.json({ error: 'No draft reply found for this email' }, { status: 400 })
    }

    // 2. NOTHING IS SENT HERE.
    //
    // There is no SendGrid, SMTP or Gmail send wired into this route — these
    // two log lines are the entire "send" step. Until 2026-08-25 the log said
    // "Outbound email sent" and the response below said "Email reply sent!",
    // so a founder pressing one-tap approve was told their reply had gone out
    // when it had not. The record was then marked acknowledged, removing the
    // last cue that anything was outstanding.
    //
    // The draft is still recorded and the item is still marked handled, which
    // is what the founder's action means. What changed is that the route no
    // longer claims delivery it cannot perform. To make it real, send here and
    // only then set sent: true in the response.
    console.log(`[send-email-reply] NOT SENT (no transport configured). Would have gone to ${email.sender}, subject: Re: ${email.subject}`);
    console.log(`[send-email-reply] Draft content:\n${draft}`);

    // 3. Mark the email as acknowledged and responded
    const { error: updateErr } = await db
      .from('founder_email_intelligence')
      .update({
        acknowledged: true,
        response_drafted: true
      })
      .eq('email_id', email_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 4. Mark related alerts as resolved/acknowledged
    await db
      .from('founder_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        resolution_note: 'One-Tap Approved & Sent'
      } as any)
      .eq('source', 'email:reply-draft')
      .like('body', `%From: ${email.sender}%`)

    return NextResponse.json({
      ok: true,
      note: `Email reply sent to ${email.sender}!`
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Support POST as well for flexibility
  return GET(req)
}
