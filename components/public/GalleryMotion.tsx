'use client'
// components/public/GalleryMotion.tsx — moving parts of /gallery: an auto-playing crossfade
// slideshow per event (pauses on hover/focus, arrow + dot controls, swipe on phones) and an
// endless photo ribbon. Both stop moving for visitors who ask for reduced motion.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GalleryPhoto } from '@/lib/public/gallery'

const INTERVAL_MS = 4200

export function Slideshow({ photos, label }: { photos: GalleryPhoto[]; label: string }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const n = photos.length
  const go = useCallback((d: number) => setI(v => (v + d + n) % n), [n])

  useEffect(() => {
    if (n < 2 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI(v => (v + 1) % n), INTERVAL_MS)
    return () => clearInterval(t)
  }, [n, paused])

  if (n === 0) {
    return (
      <div className="gal-empty" role="img" aria-label={`${label}: photos coming soon`}>
        <span>📸</span>
        <small>Photos coming soon</small>
      </div>
    )
  }

  return (
    <div
      className="gal-show"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photos`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={e => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      {photos.map((ph, k) => (
        <figure key={ph.src} className={`gal-slide ${k === i ? 'on' : ''}`} aria-hidden={k !== i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.src} alt={ph.alt} loading={k === 0 ? 'eager' : 'lazy'} />
        </figure>
      ))}
      {n > 1 && (
        <>
          <button className="gal-nav prev" aria-label="Previous photo" onClick={() => go(-1)}>‹</button>
          <button className="gal-nav next" aria-label="Next photo" onClick={() => go(1)}>›</button>
          <div className="gal-dots">
            {photos.map((ph, k) => (
              <button key={ph.src} className={k === i ? 'on' : ''} aria-label={`Show photo ${k + 1} of ${n}`} onClick={() => setI(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Ribbon({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null
  const loop = [...photos, ...photos]
  return (
    <div className="gal-ribbon" aria-hidden="true">
      <div className="gal-track">
        {loop.map((ph, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${ph.src}-${k}`} src={ph.src} alt="" loading="lazy" />
        ))}
      </div>
    </div>
  )
}
