import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'
import { GALLERY_EVENTS, FOUNDER, NVIDIA_INCEPTION_BADGE, type GalleryPhoto } from '@/lib/public/gallery'

export const metadata: Metadata = {
  title: 'Gallery — Pranix AI Labs',
  description: 'Pranix AI Labs at NVIDIA, Google for Startups and T-Hub events — photos, showcases and the founder.',
  alternates: { canonical: 'https://www.pranixailabs.com/gallery' },
}

function Photos({ photos, label }: { photos: GalleryPhoto[]; label: string }) {
  if (photos.length === 0) {
    return (
      <div className="gal-empty" role="img" aria-label={`${label} — photos coming soon`}>
        <span>📸</span>
        <small>Photos coming soon</small>
      </div>
    )
  }
  return (
    <div className="gal-grid">
      {photos.map(ph => (
        <a key={ph.src} href={ph.src} target="_blank" rel="noopener noreferrer" className="gal-ph">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.src} alt={ph.alt} loading="lazy" />
        </a>
      ))}
    </div>
  )
}

export default function GalleryPage() {
  return (
    <section className="block wrap">
      <SectionHead
        kicker="Gallery"
        title={<>Where Pranix <span className="grad-text">shows up</span></>}
        sub="Events, showcases and ecosystem programmes — NVIDIA, Google for Startups and T-Hub."
      />

      <div className="pcard rv gal-member" style={{ marginTop: 34 }}>
        <a href="https://www.nvidia.com/en-us/startups/" target="_blank" rel="noopener noreferrer" className="gal-badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NVIDIA_INCEPTION_BADGE} alt="NVIDIA Inception Program member badge" width={220} height={95} />
        </a>
        <div>
          <h3>Member of NVIDIA Inception</h3>
          <p className="pdesc" style={{ marginTop: 8 }}>
            Pranix AI Labs is part of NVIDIA Inception, NVIDIA&apos;s programme for AI startups. We showcased Aaria, our multilingual
            voice engine for Indian users, at NVIDIA&apos;s VoiceAI Ecosystem Meetup in Bengaluru.
          </p>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 28 }}>
        {GALLERY_EVENTS.map((ev, i) => (
          <article key={ev.id} className={`pcard rv${i % 2 ? ' d1' : ''}`}>
            <Photos photos={ev.photos} label={ev.title} />
            <h3 style={{ marginTop: 16 }}>{ev.title}</h3>
            <div className="ptag">{ev.date} · {ev.place}</div>
            <p className="pdesc">{ev.blurb}</p>
            <div className="ptags">
              <span>Host: {ev.host}</span>
              {ev.tags.map(t => <span key={t}>{t}</span>)}
            </div>
          </article>
        ))}
      </div>

      <div className="pcard rv d2" style={{ marginTop: 28 }}>
        <div className="sec-kicker">The founder</div>
        <h3>{FOUNDER.name}</h3>
        <div className="ptag">{FOUNDER.role}</div>
        <Photos photos={FOUNDER.photos} label={FOUNDER.name} />
        <a className="plink" href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14, display: 'inline-block' }}>
          Connect on LinkedIn →
        </a>
      </div>
    </section>
  )
}
