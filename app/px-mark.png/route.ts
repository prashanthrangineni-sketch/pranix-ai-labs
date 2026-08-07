// app/px-mark.png/route.ts — square Pranix P-mark for favicon + nav.
// Rendered at request time from the canonical /logo.png (682x1024) by cropping
// the P region (x:89, y:191, 507x524) onto a white 192x192 tile via next/og.
// No embedded binary data — always faithful to the real logo.
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// scale = 192 / 524 (fit region height); img = 682x1024 * scale ≈ 250x375
// left = -(89 * scale) + centering ≈ -30 ; top = -(191 * scale) ≈ -70
export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const el = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      },
      children: {
        type: 'img',
        props: {
          src: `${origin}/logo.png`,
          width: 250,
          height: 375,
          style: { position: 'absolute', left: -30, top: -70 },
        },
      },
    },
  } as unknown as React.ReactElement

  return new ImageResponse(el, {
    width: 192,
    height: 192,
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
  })
}
