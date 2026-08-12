// scripts/generate-icons.mjs
//
// WHY THIS EXISTS
// ---------------
// public/icon-192.png and public/icon-512.png were committed as base64 *text*
// with a .png extension. They return HTTP 200 with Content-Type image/png but
// have no PNG signature, so nothing can decode them:
//   * Google could not read the Organization JSON-LD `logo` -> no logo in Search
//   * the PWA manifest icons were dead
//   * the OG/Twitter card image was dead
// The favicon was additionally pointed at /logo.png, which is 682x1024 and
// ~436 KB. Google only accepts a *square* favicon at a sane size, so it showed
// no icon at all for pranixailabs.com.
//
// This script derives every icon from the one asset we know is valid — the
// base64 embedded in app/logo.png/route.ts — and writes real binaries into
// public/ before `next build` runs (wired up via the `prebuild` npm script).
//
// It also strips the baked-in white background so the mark can sit on the dark
// site header without a white box around it.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const LOGO_ROUTE = path.join(ROOT, 'app', 'logo.png', 'route.ts')
const OUT_DIR = path.join(ROOT, 'public')

// Background-removal thresholds. The master logo sits on a near-white
// (#fafafa-ish) plate, so anything bright and unsaturated is background.
const BG_MIN = 232 // >= this on all channels and low saturation => fully background
const BG_SOFT = 205 // between BG_SOFT and BG_MIN => feathered edge
const BG_SAT = 12 // max channel spread still considered "grey/white"
const BG_SAT_SOFT = 18

function fail(msg) {
  console.error(`\n[generate-icons] FAILED: ${msg}\n`)
  process.exit(1)
}

/** Pull the master logo base64 out of the route file (single source of truth). */
async function readMasterLogo() {
  if (!existsSync(LOGO_ROUTE)) fail(`cannot find ${LOGO_ROUTE}`)
  const src = await readFile(LOGO_ROUTE, 'utf8')
  const m = src.match(/const\s+LOGO_BASE64\s*=\s*["'`]([A-Za-z0-9+/=\s]+)["'`]/)
  if (!m) fail('could not locate LOGO_BASE64 in app/logo.png/route.ts')
  const buf = Buffer.from(m[1].replace(/\s+/g, ''), 'base64')
  if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
    fail('LOGO_BASE64 did not decode to a valid PNG')
  }
  return buf
}

/** Knock out the white plate, returning raw RGBA + dimensions. */
async function removeBackground(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2]
    const mn = Math.min(r, g, b)
    const sat = Math.max(r, g, b) - mn
    if (mn >= BG_MIN && sat <= BG_SAT) {
      data[p + 3] = 0
    } else if (mn >= BG_SOFT && sat <= BG_SAT_SOFT) {
      data[p + 3] = Math.round(((BG_MIN - mn) / (BG_MIN - BG_SOFT)) * 255)
    }
  }
  return { data, width, height }
}

/** Rows that actually contain ink, grouped into contiguous bands. */
function inkBands({ data, width, height }, alphaFloor = 24, minRun = 3) {
  const bands = []
  let start = null
  for (let y = 0; y < height; y++) {
    let ink = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaFloor) { ink++; if (ink > minRun) break }
    }
    const on = ink > minRun
    if (on && start === null) start = y
    if ((!on || y === height - 1) && start !== null) {
      const end = on ? y : y - 1
      bands.push({ top: start, bottom: end, height: end - start + 1 })
      start = null
    }
  }
  return bands
}

/** Tight bounding box of ink within a row range. */
function bbox({ data, width }, top, bottom, alphaFloor = 24) {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaFloor) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) fail('no visible pixels found after background removal')
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function rawSharp({ data, width, height }) {
  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
}

/** Crop a region and letterbox it onto a transparent square of `size`. */
async function squareFrom(raw, region, size, padRatio) {
  const pad = Math.round(size * padRatio)
  const box = size - pad * 2
  const scale = Math.min(box / region.width, box / region.height)
  const w = Math.max(1, Math.round(region.width * scale))
  const h = Math.max(1, Math.round(region.height * scale))

  const inner = await rawSharp(raw)
    .extract(region)
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: inner, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * Minimal ICO writer. Modern browsers and Googlebot both accept PNG-in-ICO,
 * so we embed the PNGs verbatim rather than emitting legacy BMP frames.
 */
function buildIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(pngs.length, 4)

  const dir = Buffer.alloc(16 * pngs.length)
  let offset = header.length + dir.length

  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir[o] = size >= 256 ? 0 : size // width  (0 means 256)
    dir[o + 1] = size >= 256 ? 0 : size // height
    dir[o + 2] = 0 // palette size
    dir[o + 3] = 0 // reserved
    dir.writeUInt16LE(1, o + 4) // colour planes
    dir.writeUInt16LE(32, o + 6) // bits per pixel
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })

  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)])
}

async function main() {
  console.log('[generate-icons] deriving brand icons from app/logo.png/route.ts')

  const master = await readMasterLogo()
  const raw = await removeBackground(master)
  console.log(`[generate-icons] master logo ${raw.width}x${raw.height}, background removed`)

  await mkdir(OUT_DIR, { recursive: true })

  // Full lockup (mark + wordmark), trimmed and transparent — used in the site
  // header/footer so the logo no longer sits inside a white plate.
  const full = bbox(raw, 0, raw.height - 1)
  const fullPng = await rawSharp(raw)
    .extract(full)
    .resize({ height: 256, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(path.join(OUT_DIR, 'logo-transparent.png'), fullPng)
  console.log(`[generate-icons] logo-transparent.png (${full.width}x${full.height} -> h256)`)

  // The favicon must stay legible at 16px, so it uses the "P" glyph only.
  // The glyph is the tallest contiguous band; the wordmark lines sit below it.
  const bands = inkBands(raw)
  if (!bands.length) fail('no ink bands detected')
  const glyphBand = bands.reduce((a, b) => (b.height > a.height ? b : a))
  const glyph = bbox(raw, glyphBand.top, glyphBand.bottom)
  console.log(
    `[generate-icons] glyph band rows ${glyphBand.top}-${glyphBand.bottom} ` +
      `-> ${glyph.width}x${glyph.height} (of ${bands.length} bands)`
  )

  const targets = [
    ['icon-512.png', 512],
    ['icon-192.png', 192],
    ['apple-touch-icon.png', 180],
    ['icon-96.png', 96],
  ]
  for (const [name, size] of targets) {
    await writeFile(path.join(OUT_DIR, name), await squareFrom(raw, glyph, size, 0.06))
    console.log(`[generate-icons] ${name} (${size}x${size}, transparent)`)
  }

  // favicon.ico — Googlebot's fallback lookup and what Search renders.
  const icoSizes = [16, 32, 48]
  const frames = []
  for (const size of icoSizes) {
    frames.push({ size, buf: await squareFrom(raw, glyph, size, 0.04) })
  }
  await writeFile(path.join(OUT_DIR, 'favicon.ico'), buildIco(frames))
  console.log(`[generate-icons] favicon.ico (${icoSizes.join('/')})`)

  // Sanity check: everything we just wrote must decode.
  for (const [name] of targets) {
    const meta = await sharp(path.join(OUT_DIR, name)).metadata()
    if (meta.width !== meta.height) fail(`${name} is not square (${meta.width}x${meta.height})`)
  }

  console.log('[generate-icons] done — all icons are valid, square and transparent')
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)))
