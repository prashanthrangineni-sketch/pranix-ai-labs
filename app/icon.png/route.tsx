import { ImageResponse } from 'next/og'

export const runtime = 'edge'

/**
 * Square brand icon for browsers, Google Search and social platforms.
 *
 * Why this exists:
 *   /logo.png is the full brand lockup — 682x1024 portrait, containing the 3D
 *   "P" mark PLUS the "PRANIX AI LABS" wordmark underneath. Google REJECTS
 *   non-square favicons, which is why no icon was appearing in search results.
 *
 * This route crops the source lockup down to just the 3D "P" mark
 * (x 90..592, y 192..713 in the original) and centres it on a 512x512 canvas.
 *
 * Geometry (derived by sampling the source PNG):
 *   scale     = 450 / 522  = 0.8621   (mark height -> 450px inside a 512 box)
 *   scaled img= 682x1024 * 0.8621 = 588x883
 *   left      = (512 - 434) / 2 - (90  * 0.8621) = -38
 *   top       = (512 - 450) / 2 - (192 * 0.8621) = -134
 */
const SRC = 'https://www.pranixailabs.com/logo.png'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#F9F9FA',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SRC}
          alt="Pranix AI Labs"
          width={588}
          height={883}
          style={{ position: 'absolute', left: -38, top: -134 }}
        />
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  )
}
