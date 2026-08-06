// components/public/cards.tsx — shared presentational pieces (server-safe)
import type { Product } from '@/lib/public/data'

export function ProductIcon({ p }: { p: Product }) {
  if (p.logoSvg) return <div className="picon" dangerouslySetInnerHTML={{ __html: p.logoSvg }} />
  if (p.logo) return <div className={`picon ${p.logoTile ? 'tile' : ''}`}><img src={p.logo} alt={`${p.name} logo`} /></div>
  return <div className="picon" style={{ background: `linear-gradient(135deg,${p.color},${p.color}cc)` }}>{p.emoji}</div>
}

export function StatusBadge({ p }: { p: Product }) {
  return <span className={`badge ${p.status}`}><span className="bdot" />{p.statusTxt}</span>
}

export function ProductCard({ p, full }: { p: Product; full?: boolean }) {
  return (
    <article className="pcard rv">
      <div className="ptop"><ProductIcon p={p} /><StatusBadge p={p} /></div>
      <h3>{p.name}</h3><div className="ptag">{p.tag}</div>
      <p className="pdesc">{p.desc}</p>
      {full && <ul className="feat">{p.feats.map(f => <li key={f}>{f}</li>)}</ul>}
      <div className="ptags">
        <span className="aaria-chip">🎙️ {p.aariaLive ? 'Aaria voice · live' : 'Aaria voice · rolling out'}</span>
        {p.tags.map(t => <span key={t}>{t}</span>)}
      </div>
      <a className="plink" href={p.url} target="_blank" rel="noopener noreferrer">Visit {p.name.toLowerCase()}.com →</a>
    </article>
  )
}

export function SectionHead({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="rv">
      <div className="sec-kicker">{kicker}</div>
      <h2 className="sec-title">{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  )
}
