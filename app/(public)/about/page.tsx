import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'

export const metadata: Metadata = { title: 'About — Pranix AI Labs' }

export default function AboutPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="The lab" title={<>An AI-native company, <span className="grad-text">built differently</span></>} />
      <div className="grid g2" style={{ marginTop: 34 }}>
        <div className="pcard rv"><h3>🎌 The origin</h3>
          <p className="pdesc" style={{ marginTop: 12 }}>Pranix AI Labs Pvt Ltd is a DPIIT-recognized startup and T-Hub member from Hyderabad, Telangana. We build consumer and institutional products for India — priced for India, in India&apos;s languages, on any phone.</p>
          <p className="pdesc">Instead of a large engineering org, Pranix runs a supervised fleet of AI agents on protocol-grade infrastructure. Humans decide. Agents execute. Every merge is founder-approved.</p>
        </div>
        <div className="pcard rv d1"><h3>⚙️ The operating model</h3>
          <ul className="feat" style={{ marginTop: 12 }}>
            <li><b>Deterministic-first:</b> majority of logic is rules-based, not vibes-based</li>
            <li><b>Sovereign data:</b> PostgreSQL infrastructure we control</li>
            <li><b>Supervised autonomy:</b> ~90/10 human-agent responsibility split</li>
            <li><b>Provider-neutral:</b> no single AI vendor lock-in</li>
            <li><b>Event-sourced:</b> every action audit-logged and replayable</li>
            <li><b>Multi-product orchestration:</b> one control plane, seven products</li>
          </ul>
        </div>
      </div>
      <div className="rv d2" style={{ marginTop: 44 }}>
        <div className="sec-kicker">Recognitions &amp; registrations</div>
        <div className="certs">
          <span className="cert">🏢 T-Hub member</span>
          <span className="cert">🏅 DPIIT: DIPP241828</span>
          <span className="cert">🏭 MSME: UDYAM-TS-02-0307772</span>
          <span className="cert">📜 CIN: U62011TS2026PTC209631</span>
          <span className="cert">☁️ Microsoft for Startups</span>
          <span className="cert">🚀 AWS Startup Program</span>
          <span className="cert">🛒 ONDC network participant</span>
        </div>
      </div>
    </section>
  )
}
