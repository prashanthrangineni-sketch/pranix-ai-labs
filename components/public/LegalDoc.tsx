// components/public/LegalDoc.tsx — shared renderer for /privacy, /terms, /refunds.
// Server component. Content lives in lib/public/legal.ts.
import type { LegalSection } from '@/lib/public/legal'
import { EFFECTIVE_DATE, ENTITY, CIN } from '@/lib/public/legal'

export default function LegalDoc({
  title,
  intro,
  sections,
  children,
}: {
  title: string
  intro: string
  sections: LegalSection[]
  children?: React.ReactNode
}) {
  return (
    <section className="block wrap">
      <div style={{ maxWidth: 780 }}>
        <div className="sec-kicker">Legal</div>
        <h1 className="sec-title" style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: '.8rem', color: 'var(--text3)', marginBottom: 24 }}>
          Effective {EFFECTIVE_DATE} · {ENTITY} · CIN {CIN}
        </p>
        <p style={{ fontSize: '.92rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 40 }}>
          {intro}
        </p>

        {sections.map(s => (
          <section key={s.title} style={{ marginBottom: 34 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10 }}>{s.title}</h2>
            {s.body.split('\n\n').map((para, i) => (
              <p
                key={i}
                style={{
                  fontSize: '.88rem',
                  color: 'var(--text2)',
                  lineHeight: 1.8,
                  marginBottom: 10,
                  whiteSpace: 'pre-line',
                }}
              >
                {para}
              </p>
            ))}
            {s.list && (
              <ul style={{ margin: '10px 0 0 18px', padding: 0 }}>
                {s.list.map(item => (
                  <li
                    key={item}
                    style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.75, marginBottom: 6 }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {/* extra content injected after a named section */}
            {children && s.title.startsWith('7. Sub-processors') ? children : null}
          </section>
        ))}
      </div>
    </section>
  )
}
