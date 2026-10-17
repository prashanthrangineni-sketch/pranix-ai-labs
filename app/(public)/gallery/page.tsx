import type { Metadata } from 'next'
import { SectionHead } from '@/components/public/cards'
import { Slideshow, Ribbon } from '@/components/public/GalleryMotion'
import { GALLERY_EVENTS, FOUNDER, HIGHLIGHTS, NVIDIA_INCEPTION_BADGE } from '@/lib/public/gallery'

export const metadata: Metadata = {
  title: 'Gallery — Pranix AI Labs',
  description:
    'Pranix AI Labs at NVIDIA and Google for Startups: presenting QuietKeep at NVIDIA’s Voice AI showcase in Bengaluru, NVIDIA’s Bring Your Own Problem series in Hyderabad, and Google for Startups Hub sessions at T-Hub.',
  alternates: { canonical: 'https://www.pranixailabs.com/gallery' },
}

export default function GalleryPage() {
  const allPhotos = GALLERY_EVENTS.flatMap(e => e.photos)
  return (
    <>
      <section className="block wrap">
        <SectionHead
          kicker="Gallery"
          title={<>Where Pranix <span className="grad-text">shows up</span></>}
          sub="On stage at NVIDIA, in the room with Google for Startups, and building alongside India’s AI founders."
        />
        <div className="gal-stats rv" style={{ marginTop: 30 }}>
          {HIGHLIGHTS.map(h => (
            <div key={h.l} className="gal-stat">
              <b>{h.n}</b>
              <span>{h.l}</span>
            </div>
          ))}
        </div>
      </section>

      <Ribbon photos={allPhotos} />

      <section className="block wrap" style={{ paddingTop: 10 }}>
        <div className="pcard rv gal-member">
          <a href="https://www.nvidia.com/en-us/startups/" target="_blank" rel="noopener noreferrer" className="gal-badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NVIDIA_INCEPTION_BADGE} alt="NVIDIA Inception Program member badge" width={220} height={95} />
          </a>
          <div>
            <h3>Member of NVIDIA Inception</h3>
            <p className="pdesc" style={{ marginTop: 8 }}>
              Pranix AI Labs is part of NVIDIA Inception, NVIDIA&apos;s programme for AI startups — and was one of eight startups
              chosen to present at the close of NVIDIA&apos;s Voice AI &ldquo;Bring Your Own Problem&rdquo; series.
            </p>
          </div>
        </div>

        <div className="gal-events">
          {GALLERY_EVENTS.map((ev, i) => (
            <article key={ev.id} className={`gal-event rv ${i % 2 ? 'flip' : ''}`}>
              <Slideshow photos={ev.photos} label={ev.title} />
              <div className="gal-copy">
                <div className="gal-meta">{ev.date} · {ev.place}</div>
                <h3>{ev.title}</h3>
                <p className="gal-proud">{ev.proud}</p>
                <p className="pdesc">{ev.blurb}</p>
                <ul className="feat">{ev.points.map(p => <li key={p}>{p}</li>)}</ul>
                <div className="ptags">
                  <span>Host: {ev.host}</span>
                  {ev.tags.map(t => <span key={t}>{t}</span>)}
                </div>
                {ev.source && (
                  <a className="plink" href={ev.source.url} target="_blank" rel="noopener noreferrer">{ev.source.label} →</a>
                )}
              </div>
            </article>
          ))}
        </div>

        <article className="gal-event rv">
          <Slideshow photos={FOUNDER.photos} label={FOUNDER.name} />
          <div className="gal-copy">
            <div className="gal-meta">The founder</div>
            <h3>{FOUNDER.name}</h3>
            <p className="gal-proud">{FOUNDER.role} — building India-first AI products, in India&apos;s languages, from Hyderabad.</p>
            <a className="plink" href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer">Connect on LinkedIn →</a>
          </div>
        </article>
      </section>
    </>
  )
}
