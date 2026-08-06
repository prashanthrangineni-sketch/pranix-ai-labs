import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'
import { SERVICES } from '@/lib/public/data'

export const metadata: Metadata = { title: 'Services — Pranix AI Labs', description: 'Websites, Play Store apps, voice AI, agent automation and AI video content — built by Pranix Studio. Call +91 95154 79595.' }

export default function ServicesPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Pranix Studio" title={<>We build for <span className="grad-text">you</span> too</>}
        sub="The same AI-native pipeline that ships our seven products is available for your business — design to Play Store, at startup speed." />
      <div className="grid g3">
        {SERVICES.map((s, i) => (
          <div key={s.t} className={`scard rv d${i % 3}`}><span className="semj">{s.e}</span><h3>{s.t}</h3><p>{s.d}</p><span className="stag">{s.tag}</span></div>
        ))}
      </div>
      <div className="cta-band rv" style={{ marginTop: 56 }}>
        <h2>Have a project in mind?</h2>
        <p>Call us or write in — we scope fast and ship faster.</p>
        <div className="hero-ctas" style={{ marginTop: 0 }}>
          <a className="btn btn-primary" href="tel:+919515479595">📞 Call 95154 79595</a>
          <a className="btn btn-ghost" href="mailto:support@pranixailabs.com">✉️ support@pranixailabs.com</a>
        </div>
      </div>
    </section>
  )
}
