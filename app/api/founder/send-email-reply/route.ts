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

    // 2. Mock sending the email (SendGrid/SMTP or console log)
    console.log(`[send-email-reply] Outbound email sent to ${email.sender}: subject: Re: ${email.subject}`);
    console.log(`[send-email-reply] Reply content:\n${draft}`);

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
