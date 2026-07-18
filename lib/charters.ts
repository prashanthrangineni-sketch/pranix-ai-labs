import fs from 'fs'
import path from 'path'

export interface Charter {
  slug: string
  productKey: string
  productName: string
  dateLabel: string
  whatItIs: string
  founderNeeds: string
  liveVerified: string
  next3: string
}

// Explicit list (not a directory scan) so Vercel's file tracer and this
// module both agree on exactly what ships — see next.config.js
// outputFileTracingIncludes for the matching bundling config.
const CHARTER_FILES: { file: string; productKey: string }[] = [
  { file: '01_QuickScanZ.md', productKey: 'quickscanz' },
  { file: '02_SchoolOS.md', productKey: 'schoolos' },
  { file: '03_VidyaGrid.md', productKey: 'vidyagrid' },
  { file: '04_EasyVenuez.md', productKey: 'easyvenuez' },
  { file: '05_InsureUPI.md', productKey: 'insureupi' },
  { file: '06_Cart2Save.md', productKey: 'cart2save' },
  { file: '07_QuietKeep.md', productKey: 'quietkeep' },
  { file: '08_PranixSite_CommandCentre.md', productKey: 'pranix_site' },
  { file: '09_Aaria.md', productKey: 'pranix_aaria' },
  { file: '10_AgentEngine.md', productKey: 'pranix_agents' },
]

function section(raw: string, heading: string): string {
  // Heading lines carry a variable suffix, e.g. "## LIVE-VERIFIED STATE (control
  // plane, read 2026-07-17 ~03:30Z)" — match up to end-of-line, capture until
  // the next "## " heading or end of file.
  const re = new RegExp(`^##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s+|$(?![\\s\\S]))`, 'm')
  const m = raw.match(re)
  return m ? m[1].trim() : ''
}

function parseCharter(raw: string, file: string, productKey: string): Charter {
  const slug = file.replace(/\.md$/, '')
  const titleMatch = raw.match(/^#\s+(.+?)\s*—\s*Product Charter\s*\(([^)]+)\)/m)
  return {
    slug,
    productKey,
    productName: titleMatch ? titleMatch[1].trim() : slug,
    dateLabel: titleMatch ? titleMatch[2].trim() : '',
    whatItIs: section(raw, 'WHAT IT IS'),
    founderNeeds: section(raw, 'WHAT THE FOUNDER NEEDS NOW'),
    liveVerified: section(raw, 'LIVE-VERIFIED STATE'),
    next3: section(raw, 'NEXT 3'),
  }
}

export function getCharters(): Charter[] {
  const dir = path.join(process.cwd(), 'content', 'charters')
  return CHARTER_FILES.map(({ file, productKey }) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    return parseCharter(raw, file, productKey)
  })
}

// Extracts "outcome_name **STATUS**" pairs from a LIVE-VERIFIED STATE section,
// e.g. "warranty_storage **PASS**" or "camera_capture **DEGRADED**". Used by
// the weekly drift-brief job to compare charter claims against live
// outcome_checks rows. Exported so the cron route and this module share one
// parsing rule instead of drifting from each other.
export function extractClaimedOutcomes(liveVerifiedText: string): { outcome: string; status: string }[] {
  const results: { outcome: string; status: string }[] = []
  const re = /([a-z][a-z0-9_]{2,})\s+\*\*(PASS|FAIL|FAILED|DEGRADED)\*\*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(liveVerifiedText)) !== null) {
    results.push({ outcome: m[1].toLowerCase(), status: m[2].toUpperCase() })
  }
  return results
}
