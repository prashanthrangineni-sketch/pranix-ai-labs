import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'
import { STATUS } from '@/lib/public/data'

export const metadata: Metadata = { title: 'Status — Pranix AI Labs' }

export default function StatusPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Transparency" title={<>Product <span className="grad-text">status board</span></>}
        sub="Where every product stands right now — phase, deployment health, and its road to Google Play." />
      <div className="sboard rv d1">
        <div className="srow head"><div>Product</div><div>Phase</div><div>Deployment</div><div className="scol-link">Site</div></div>
        {STATUS.map(s => (
          <div className="srow" key={s.n}>
            <div className="sname">
              <span className="sdot" style={{ background: s.c, boxShadow: `0 0 8px ${s.c}` }} />{s.n}
              <span className={`badge ${s.play}`} style={{ marginLeft: 6 }}><span className="bdot" />{s.playTxt}</span>
            </div>
            <div>{s.phase}</div>
            <div style={{ color: s.health === 'Healthy' ? 'var(--emerald)' : 'var(--pink)' }}>{s.health === 'Healthy' ? '● Healthy' : '◌ In development'}</div>
            <div className="scol-link"><a href={s.url} target="_blank" rel="noopener noreferrer">visit ↗</a></div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 18, fontSize: '.75rem', color: 'var(--text3)' }} className="rv d2">Phases sync from the Pranix control plane. Play Store statuses update as releases roll out.</p>
    </section>
  )
}
