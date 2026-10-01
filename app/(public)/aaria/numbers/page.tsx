import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aaria — measured numbers — Pranix AI Labs',
  description:
    'How well Pranix Aaria understands Telugu, Hindi and English: word error rates measured on recordings of real people, cloud and on-phone, with how each number was measured.',
  alternates: { canonical: 'https://www.pranixailabs.com/aaria/numbers' },
  robots: { index: true, follow: true },
}

type Cell = string | null // null = not measured / not offered (shown as words, never as 0)

const cell = { padding: '9px 10px', borderBottom: '1px solid var(--stroke)', fontSize: '.86rem' } as const
const num = { ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const }
const head = { ...cell, color: 'var(--text3)', fontWeight: 600, textAlign: 'left' as const, whiteSpace: 'nowrap' as const }

function Val({ v, missing }: { v: Cell; missing: string }) {
  return v === null ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>{missing}</span> : <>{v}</>
}

const CLOUD: { name: string; te: Cell; hi: Cell; en: Cell; teMissing?: string; hiMissing?: string; enMissing?: string }[] = [
  { name: 'Sarvam v4 with script mode and a 50-word boost list', te: '13.0%', hi: '6.2%', en: null, enMissing: 'not measured' },
  { name: 'Sarvam v3', te: '16.4%', hi: '8.4%', en: null, enMissing: 'not measured' },
  { name: 'AI4Bharat IndicConformer (open source, MIT, run on a CPU)', te: '16.4%', hi: '10.6%', en: null, enMissing: 'not offered' },
  { name: 'NVIDIA Canary', te: null, teMissing: 'not offered', hi: '10.7%', en: '4.8%' },
  { name: 'Bhashini', te: '18.1%', hi: null, hiMissing: 'not published*', en: null, enMissing: 'not measured' },
]

const EDGE = [
  { lang: 'English', model: 'Moonshine tiny, int8 (MIT)', wer: '14.3%', secs: '0.17' },
  { lang: 'Hindi', model: 'IndicConformer, int8 (MIT)', wer: '12.3%', secs: '0.40' },
  { lang: 'Telugu', model: 'IndicConformer, int8 (MIT)', wer: '23.0%', secs: '0.80' },
]

const p = { fontSize: '.9rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 12 } as const
const li = { fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: 6 } as const

export default function AariaNumbersPage() {
  return (
    <section className="block wrap">
      <div style={{ maxWidth: 820 }}>
        <div className="sec-kicker">Pranix Aaria</div>
        <h1 className="sec-title" style={{ marginBottom: 12 }}>What we measured, and how</h1>
        <p style={p}>
          People in Telangana mix Telugu, Hindi and English in one sentence, so we measure each language separately, on
          recordings of real people, and publish only what we measured. The figures are word error rates: the share of
          words a recogniser got wrong. Lower is better.
        </p>

        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '36px 0 6px' }}>1 · Cloud speech recognition</h2>
        <p style={{ ...p, fontSize: '.8rem', color: 'var(--text3)' }}>Measured 30 September – 1 October 2026</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={head}>Recogniser</th>
                <th style={{ ...head, textAlign: 'right' }}>Telugu</th>
                <th style={{ ...head, textAlign: 'right' }}>Hindi</th>
                <th style={{ ...head, textAlign: 'right' }}>English</th>
              </tr>
            </thead>
            <tbody>
              {CLOUD.map(r => (
                <tr key={r.name}>
                  <td style={cell}>{r.name}</td>
                  <td style={num}><Val v={r.te} missing={r.teMissing ?? 'not measured'} /></td>
                  <td style={num}><Val v={r.hi} missing={r.hiMissing ?? 'not measured'} /></td>
                  <td style={num}><Val v={r.en} missing={r.enMissing ?? 'not measured'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul style={{ margin: '14px 0 0 18px', padding: 0 }}>
          <li style={li}>Every recogniser was scored on the same recordings of real people reading sentences (150 in this comparison; 49 Telugu and 50 Hindi in the IndicConformer run) with the same scorer.</li>
          <li style={li}>&ldquo;Not offered&rdquo; means the service has no model for that language. We do not score it; a 0% would be false.</li>
          <li style={li}>The Sarvam v4 result combines three changes (v4, script mode and the boost list), which we have not yet measured separately.</li>
          <li style={li}>*Bhashini&apos;s Hindi result was recorded only as level with the others, not as a number, so it is left out.</li>
          <li style={li}>Cloud round-trip time: half of requests within 4.4 s, 95% within 7.6 s, on a free-tier cloud server with no GPU.</li>
        </ul>

        <p style={{ ...p, borderLeft: '3px solid var(--stroke)', paddingLeft: 12, margin: '32px 0' }}>
          The two result sets on this page come from different tests and cannot be compared with each other. Each number
          carries its own test.
        </p>

        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>2 · Aaria Edge: on the phone, no internet</h2>
        <p style={{ ...p, fontSize: '.8rem', color: 'var(--text3)' }}>Measured 30 September 2026</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={head}>Language</th>
                <th style={head}>Model on the phone</th>
                <th style={{ ...head, textAlign: 'right' }}>Word error</th>
                <th style={{ ...head, textAlign: 'right' }}>Seconds per 3-s clip (PC)</th>
              </tr>
            </thead>
            <tbody>
              {EDGE.map(r => (
                <tr key={r.lang}>
                  <td style={cell}>{r.lang}</td>
                  <td style={cell}>{r.model}</td>
                  <td style={num}>{r.wer}</td>
                  <td style={num}>{r.secs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul style={{ margin: '14px 0 0 18px', padding: 0 }}>
          <li style={li}>Test set: 30 read sentences per language from Google&apos;s public FLEURS test set, spoken by real people. That is long read speech, used to choose a model; on the phone Aaria only needs to recognise short commands.</li>
          <li style={li}>Speeds were measured on a PC. Phone speeds will be published after tests on a low-cost and a mid-range phone, not before.</li>
          <li style={li}>Telugu is the weakest result on both tests, and improving it is our main focus.</li>
        </ul>

        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '36px 0 10px' }}>Rules behind every number</h2>
        <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
          <li style={li}>Only numbers measured on the build described are published.</li>
          <li style={li}>A number we do not have is shown as &ldquo;not measured&rdquo;, never as zero.</li>
          <li style={li}>Computer-generated speech is never scored as if it were a person speaking.</li>
          <li style={li}>Languages not yet checked by a native speaker have no published figure.</li>
        </ul>
      </div>
    </section>
  )
}
