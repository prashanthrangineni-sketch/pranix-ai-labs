import { NextResponse } from 'next/server'
import { PX_MARK_B64 } from '@/lib/public/px-mark'

export async function GET() {
  return new NextResponse(Buffer.from(PX_MARK_B64, 'base64'), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
  })
}
