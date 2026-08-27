import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionHead } from '@/components/public/cards'
import {
  ENTITY, CIN, UDYAM, DPIIT, REGISTERED_ADDRESS,
  SUPPORT_EMAIL, PHONE_DISPLAY, PHONE_TEL, WHATSAPP,
  GRIEVANCE_OFFICER, GRIEVANCE_EMAIL, ACK_SLA, GRIEVANCE_SLA,
} from '@/lib/public/legal'

export const metadata: Metadata = {
  title: 'Contact — Pranix AI Labs',
  description: `Reach Pranix AI Labs — ${SUPPORT_EMAIL} · ${PHONE_DISPLAY} for websites, apps and AI services. Registered office, CIN and Grievance Officer details.`,
  alternates: { canonical: 'https://www.pranixailabs.com/contact' },
}

export default function ContactPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Say hello" title={<>Let&apos;s <span className="grad-text">talk</span></>}
        sub="Partnerships, product questions, school onboarding, venue listings — pick a channel. We're quick." />
      <div className="grid g3">
        <a className="ccard rv" href={`mailto:${SUPPORT_EMAIL}`}><span className="cemj">📮</span><h3>Email us</h3><p>{SUPPORT_EMAIL}</p></a>
        <a className="ccard rv d1" href={`tel:${PHONE_TEL}`}><span className="cemj">📞</span><h3>Call for services</h3><p>{PHONE_DISPLAY}<br /><span style={{ fontSize: '.76rem', color: 'var(--text3)' }}>websites · apps · AI solutions</span></p></a>
        <a className="ccard rv d2" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><span className="cemj">💬</span><h3>WhatsApp</h3><p>{PHONE_DISPLAY}</p></a>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        }}
      >
        <div className="ccard rv" style={{ textAlign: 'left' }}>
          <h3 style={{ marginBottom: 10 }}>Registered office</h3>
          <address style={{ fontStyle: 'normal', fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.8 }}>
            {REGISTERED_ADDRESS.map(line => <span key={line} style={{ display: 'block' }}>{line}</span>)}
            <span style={{ display: 'block', marginTop: 10 }}>
              <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
            </span>
            <span style={{ display: 'block' }}>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </span>
          </address>
          <p style={{ fontSize: '.76rem', color: 'var(--text3)', lineHeight: 1.8, marginTop: 14 }}>
            CIN {CIN}<br />
            MSME {UDYAM}<br />
            DPIIT {DPIIT}<br />
            Monday–Saturday, 10:00–19:00 IST
          </p>
        </div>

        <div className="ccard rv d1" style={{ textAlign: 'left' }}>
          <h3 style={{ marginBottom: 10 }}>Grievance Officer</h3>
          <p style={{ fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.8 }}>
            {GRIEVANCE_OFFICER}<br />
            {ENTITY}<br />
            <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>
          </p>
          <p style={{ fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.8, marginTop: 12 }}>
            Appointed under the DPDP Act 2023 and the IT (Intermediary Guidelines and Digital
            Media Ethics Code) Rules 2021. Complaints and data-rights requests are acknowledged
            within {ACK_SLA} and answered within {GRIEVANCE_SLA}.
          </p>
          <p style={{ fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.8, marginTop: 12 }}>
            See also our <Link href="/privacy">Privacy Policy</Link>,{' '}
            <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/refunds">Refund &amp; Cancellation Policy</Link>.
          </p>
        </div>
      </div>
    </section>
  )
}
