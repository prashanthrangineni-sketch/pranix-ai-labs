import { ImageResponse } from 'next/og'

export const runtime = 'edge'

/**
 * Square brand icon for browsers and Google Search.
 *
 * Why this exists:
 *   /logo.png is the full brand lockup — 682x1024 portrait, containing the 3D
 *   "P" mark PLUS the "PRANIX AI LABS" wordmark underneath. Google REJECTS
 *   non-square favicons, which is why no icon appeared in search results.
 *
 * This route crops the source lockup to just the 3D "P" mark
 * (x 90..592, y 192..713 in the original) and centres it on a square canvas.
 *
 * Size is 192x192 on purpose. Google's favicon guidance asks for a square
 * whose dimensions are a MULTIPLE OF 48px (48, 96, 144, 192...). 512 is not,
 * and rendered a ~360KB file — heavy for an asset the crawler fetches often.
 * 192 satisfies the spec, stays crisp at every tab/search size, and is ~6x
 * smaller.
 *
 * Geometry (derived by sampling the source PNG):
 *   scale      = 169 / 522 = 0.3238   (mark height -> 169px inside a 192 box)
 *   scaled img = 682x1024 * 0.3238 = 221x332
 *   left       = (192 - 163) / 2 - (90  * 0.3238) = -15
 *   top        = (192 - 169) / 2 - (192 * 0.3238) = -51
 */
const SRC = 'https://www.pranixailabs.com/logo.png'
const SIZE = 192

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
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
          width={221}
          height={332}
          style={{ position: 'absolute', left: -15, top: -51 }}
        />
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  )
}
