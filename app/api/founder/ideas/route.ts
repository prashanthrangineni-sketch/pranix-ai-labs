import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const gate = await requireWritableFounder()
  if (gate instanceof NextResponse) return gate

  try {
    const body = await req.json()
    const { text, audio_base64, lang_hint = 'en' } = body

    let ideaText = text

    if (audio_base64) {
      const aariaUrl = process.env.AARIA_URL || 'https://pranix-aaria.onrender.com'
      const aariaRes = await fetch(`${aariaUrl}/api/voice/listen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64,
          lang_hint,
          product: 'CommandCentre',
          quality_tier: 'standard'
        })
      })

      if (!aariaRes.ok) {
        throw new Error(`Aaria listen error: ${aariaRes.statusText}`)
      }
      const aariaData = await aariaRes.json()
      ideaText = aariaData.text
    }

    if (!ideaText || typeof ideaText !== 'string' || ideaText.trim().length < 2) {
      return NextResponse.json({ error: 'Valid idea text or voice input required' }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('founder_ideas')
      .insert({
        text: ideaText.trim(),
        status: 'pending'
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, idea: data })
  } catch (err: any) {
    console.error('Failed to capture idea:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
