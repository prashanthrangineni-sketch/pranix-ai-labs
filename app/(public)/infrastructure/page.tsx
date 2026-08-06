import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'
import { INFRA } from '@/lib/public/data'

export const metadata: Metadata = { title: 'Infrastructure — Pranix AI Labs' }

export default function InfrastructurePage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Under the hood" title={<>Sovereign, deterministic, <span className="grad-text">supervised</span></>}
        sub="Pranix runs a founder-governed control plane: AI agents execute, deterministic rules decide, and a human merges every line. This is the operating fabric shared by all seven products." />
      <div className="grid g3">
        {INFRA.map((i, ix) => (
          <div key={i.t} className={`icard rv d${ix % 3}`}><span className="iemj">{i.e}</span><div className="inum">0{ix + 1} /</div><h3>{i.t}</h3><p>{i.d}</p></div>
        ))}
      </div>
      <div style={{ marginTop: 70 }} className="rv">
        <div className="sec-kicker">Execution flow</div>
        <h2 className="sec-title" style={{ fontSize: '1.6rem' }}>Founder → Gateway → Agents → Products</h2>
      </div>
      <div className="sboard rv d1" style={{ marginTop: 26 }}>
        <div className="srow"><div className="sname">🧠 Founder Command</div><div>Intent &amp; approvals</div><div>Mobile-first dashboard</div><div className="scol-link" /></div>
        <div className="srow"><div className="sname">🛰️ Pranix MCP Gateway</div><div>Advanced agent fleet · task routing &amp; RBAC</div><div>Audit-logged tool calls</div><div className="scol-link" /></div>
        <div className="srow"><div className="sname">🤖 AI Agent Fleet</div><div>Build · test · deploy</div><div>Founder-merges-only</div><div className="scol-link" /></div>
        <div className="srow"><div className="sname">🚀 Seven Products</div><div>Web + Google Play</div><div>Shared control plane</div><div className="scol-link" /></div>
      </div>
    </section>
  )
}
