'use client'
// components/public/Effects.tsx — particle canvas, sparkle cursor, scroll reveal, counters, card tilt
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function Effects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()

  // particle constellation
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const cx = cv.getContext('2d')
    if (!cx) return
    let pts: { x: number; y: number; vx: number; vy: number; r: number; h: number }[] = []
    let raf = 0
    const size = () => {
      cv.width = window.innerWidth; cv.height = window.innerHeight
      pts = Array.from({ length: Math.min(90, window.innerWidth / 14) }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + .4, h: [258, 190, 320][Math.floor(Math.random() * 3)],
      }))
    }
    size()
    window.addEventListener('resize', size)
    const anim = () => {
      cx.clearRect(0, 0, cv.width, cv.height)
      const dark = document.querySelector('.pxp')?.getAttribute('data-px-theme') !== 'light'
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > cv.width) p.vx *= -1
        if (p.y < 0 || p.y > cv.height) p.vy *= -1
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7)
        cx.fillStyle = dark ? `hsla(${p.h},90%,70%,.5)` : `hsla(${p.h},70%,50%,.3)`
        cx.fill()
      })
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2
        if (d < 16900) {
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y)
          cx.strokeStyle = dark ? `rgba(139,92,246,${.14 * (1 - d / 16900)})` : `rgba(124,58,237,${.09 * (1 - d / 16900)})`
          cx.stroke()
        }
      }
      raf = requestAnimationFrame(anim)
    }
    raf = requestAnimationFrame(anim)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])

  // sparkle cursor trail + card tilt (delegated)
  useEffect(() => {
    let last = 0
    const onMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest?.('.pcard') as HTMLElement | null
      document.querySelectorAll<HTMLElement>('.pcard').forEach(el => {
        if (el !== card) { el.style.transform = ''; return }
        const r = el.getBoundingClientRect()
        const mx = e.clientX - r.left, my = e.clientY - r.top
        el.style.setProperty('--mx', mx + 'px'); el.style.setProperty('--my', my + 'px')
        el.style.transform = `translateY(-8px) rotateX(${((my / r.height) - .5) * -7}deg) rotateY(${((mx / r.width) - .5) * 7}deg)`
      })
      const now = performance.now()
      if (now - last < 120) return
      last = now
      const s = document.createElement('span')
      s.className = 'spark'
      s.textContent = ['✦', '✧', '⋆', '✨'][Math.floor(Math.random() * 4)]
      s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'
      s.style.color = ['#8b5cf6', '#22d3ee', '#f472b6'][Math.floor(Math.random() * 3)]
      const host = document.querySelector('.pxp')
      if (!host) return
      host.appendChild(s)
      setTimeout(() => s.remove(), 800)
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  // scroll reveal + counters — rescan on route change
  useEffect(() => {
    const countUp = (el: HTMLElement) => {
      if (el.dataset.done) return
      el.dataset.done = '1'
      const target = +(el.dataset.count || 0), plus = el.dataset.plus ? '+' : ''
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min((t - t0) / 1400, 1)
        el.textContent = Math.floor(target * (1 - Math.pow(1 - k, 3))).toLocaleString() + (k === 1 ? plus : '')
        if (k < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return
      en.target.classList.add('in')
      en.target.querySelectorAll?.('[data-count]').forEach(c => countUp(c as HTMLElement))
      if ((en.target as HTMLElement).dataset?.count) countUp(en.target as HTMLElement)
    }), { threshold: .12 })
    const t = setTimeout(() => {
      document.querySelectorAll('.pxp .rv, .pxp .stat').forEach(el => io.observe(el))
    }, 60)
    return () => { clearTimeout(t); io.disconnect() }
  }, [pathname])

  return <canvas id="pxfx" ref={canvasRef} />
}
