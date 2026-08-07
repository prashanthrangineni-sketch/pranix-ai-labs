'use client'
// components/public/Hero.tsx — typewriter + orbiting product chips
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { PRODUCTS } from '@/lib/public/data'

const LINES = [
  '> building EdProSys — the school OS…',
  '> QuietKeep: a voice that acts, not answers…',
  '> Cart2Save: every price in India, one honest answer…',
  '> shipping to Google Play this week…',
  '> supervised autonomy: humans merge, agents build…',
]

function ChipIcon({ id }: { id: string }) {
  const p = PRODUCTS.find(x => x.id === id)!
  if (p.logoSvg) return <span className="chip-ic" role="img" aria-label={`${p.name} logo`} dangerouslySetInnerHTML={{ __html: p.logoSvg }} />
  if (p.logo) return <img className="chip-ic" src={p.logo} alt={`${p.name} logo`} />
  return <b>{p.emoji}</b>
}

export default function Hero() {
  const [typed, setTyped] = useState('')
  const orbitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let li = 0, ci = 0, del = false, t: ReturnType<typeof setTimeout>
    const tick = () => {
      const l = LINES[li]
      setTyped(l.slice(0, ci))
      if (!del && ci < l.length) { ci++; t = setTimeout(tick, 34) }
      else if (!del) { del = true; t = setTimeout(tick, 1600) }
      else if (ci > 0) { ci--; t = setTimeout(tick, 12) }
      else { del = false; li = (li + 1) % LINES.length; t = setTimeout(tick, 300) }
    }
    tick()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const ow = orbitRef.current
    if (!ow) return
    const chips = Array.from(ow.children) as HTMLElement[]
    let ot = 0, raf = 0
    const orbit = () => {
      ot += 0.004
      const n = chips.length
      chips.forEach((c, i) => {
        const a = ot + i * (Math.PI * 2 / n)
        const x = Math.cos(a) * (ow.offsetWidth * 0.42)
        const y = Math.sin(a) * 36
        c.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(${0.85 + 0.15 * Math.sin(a)})`
        c.style.opacity = String(0.55 + 0.45 * ((Math.sin(a) + 1) / 2))
        c.style.zIndex = Math.sin(a) > 0 ? '3' : '1'
      })
      raf = requestAnimationFrame(orbit)
    }
    raf = requestAnimationFrame(orbit)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scrollFilm = () => document.getElementById('film')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="hero wrap">
      <div className="hero-lockup"><Image src="/logo.png" alt="Pranix AI Labs logo" width={140} height={210} priority /></div><br />
      <span className="hero-kicker"><span className="dot" /> DPIIT-recognized · T-Hub member · Hyderabad 🇮🇳</span>
      <h1 className="mega">Innovate. Build.<br /><span className="grad-text">Ascend.</span></h1>
      <p className="hero-sub">One AI-native lab. Seven products shipping across commerce, education, fintech, voice AI and events — engineered by a founder-supervised fleet of AI agents.</p>
      <div className="type-line"><span>{typed}</span><span className="caret">▌</span></div>
      <div className="hero-ctas">
        <Link className="btn btn-primary" href="/products">✦ Explore the products</Link>
        <button className="btn btn-primary" onClick={scrollFilm}>▶ Watch the film</button>
      </div>
      <div className="orbitwrap" ref={orbitRef}>
        {PRODUCTS.map(p => (
          <span key={p.id} className="orbit-chip"><ChipIcon id={p.id} />{p.name}</span>
        ))}
      </div>
    </section>
  )
}
