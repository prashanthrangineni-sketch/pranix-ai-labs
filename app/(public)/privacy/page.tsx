import type { Metadata } from 'next'
import LegalDoc from '@/components/public/LegalDoc'
import { PRIVACY, SUBPROCESSORS } from '@/lib/public/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — Pranix AI Labs',
  description:
    'How Pranix AI Labs Private Limited collects, uses, stores and protects personal data across pranixailabs.com and its products, under India’s DPDP Act 2023.',
  alternates: { canonical: 'https://www.pranixailabs.com/privacy' },
  robots: { index: true, follow: true },
}

function SubprocessorTable() {
  return (
    <div style={{ overflowX: 'auto', marginTop: 14 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem', minWidth: 520 }}>
        <thead>
          <tr>
            {['Provider', 'Purpose', 'Processing region'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--stroke)',
                  color: 'var(--text3)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map(s => (
            <tr key={s.name}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--stroke)', whiteSpace: 'nowrap' }}>
                {s.name}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--stroke)', color: 'var(--text2)' }}>
                {s.purpose}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--stroke)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                {s.region}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      intro="We build products that hold personal things — reminders, invoices, school records, warranty documents, voice. This policy says plainly what we collect, why, who else touches it, how long we keep it and what you can make us do about it."
      sections={PRIVACY}
    >
      <SubprocessorTable />
    </LegalDoc>
  )
}
