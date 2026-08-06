'use client'
// components/public/BrandFilm.tsx — brand teaser with autoplay attempt, play overlay, graceful fallback
// Video file: public/brand-film.mp4 (upload pranix-teaser.mp4 there). Falls back to animated banner if missing.
import { useEffect, useRef, useState } from 'react'
import { PRODUCTS } from '@/lib/public/data'

export default function BrandFilm() {
  const vidRef = useRef<HTMLVideoElement>(null)
  const [overlay, setOverlay] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    vidRef.current?.play().then(() => setOverlay(false)).catch(() => {})
  }, [])

  const play = () => {
    const v = vidRef.current
    if (!v) return
    v.muted = false
    v.play().then(() => setOverlay(false)).catch(() => {
      v.muted = true
      v.play().then(() => setOverlay(false)).catch(() => setFailed(true))
    })
  }

  if (failed) return (
    <div className="film rv d1">
      <div className="film-fallback">
        <div className="ffk">PRANIX AI LABS</div>
        <div className="ffl grad-text">Innovate. Build. Ascend.</div>
        <div className="ffp">{PRODUCTS.map(p => <span key={p.id}>{p.name}</span>)}</div>
      </div>
    </div>
  )

  return (
    <div className="film rv d1">
      <video ref={vidRef} src="/brand-film.mp4" muted loop playsInline controls preload="metadata" onError={() => setFailed(true)} />
      {overlay && <button className="film-overlay" onClick={play}>▶&nbsp; Play the film</button>}
    </div>
  )
}
