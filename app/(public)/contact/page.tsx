import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'

export const metadata: Metadata = { title: 'Contact — Pranix AI Labs', description: 'Reach Pranix AI Labs — support@pranixailabs.com · +91 95154 79595 for websites, apps and AI services.' }

export default function ContactPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Say hello" title={<>Let&apos;s <span className="grad-text">talk</span></>}
        sub="Partnerships, product questions, school onboarding, venue listings — pick a channel. We're quick." />
      <div className="grid g3">
        <a className="ccard rv" href="mailto:support@pranixailabs.com"><span className="cemj">📮</span><h3>Email us</h3><p>support@pranixailabs.com</p></a>
        <a className="ccard rv d1" href="tel:+919515479595"><span className="cemj">📞</span><h3>Call for services</h3><p>+91 95154 79595<br /><span style={{ fontSize: '.76rem', color: 'var(--text3)' }}>websites · apps · AI solutions</span></p></a>
        <a className="ccard rv d2" href="https://wa.me/919515479595" target="_blank" rel="noopener noreferrer"><span className="cemj">💬</span><h3>WhatsApp</h3><p>+91 95154 79595</p></a>
      </div>
    </section>
  )
}
