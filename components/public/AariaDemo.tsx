'use client'
// components/public/AariaDemo.tsx — interactive multilingual voice demo (Web Speech API + typed fallback)
import { useRef, useState } from 'react'
import { A_LANGS, A_GREET, aariaAnswer } from '@/lib/public/data'

export default function AariaDemo() {
  const [lang, setLang] = useState('en-IN')
  const [out, setOut] = useState('Namaste! 🙏 Ask me about any Pranix product — try "What is Cart2Save?" or "Tell me about EdProSys".')
  const [listening, setListening] = useState(false)
  const [waving, setWaving] = useState(false)
  const [hint, setHint] = useState('Tap the mic and ask about any Pranix product')
  const [input, setInput] = useState('')
  const recRef = useRef<any>(null)
  const langRef = useRef(lang)

  const say = (txt: string) => {
    setOut(txt)
    setWaving(true)
    try {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(txt)
      u.lang = langRef.current
      u.rate = 1.02
      u.onend = () => setWaving(false)
      speechSynthesis.speak(u)
      setTimeout(() => setWaving(false), Math.min(txt.length * 70, 15000))
    } catch { setWaving(false) }
  }

  const ask = (q: string) => {
    if (!q.trim()) return
    setOut('…')
    setTimeout(() => say(aariaAnswer(q)), 350)
  }

  const pickLang = (c: string) => {
    setLang(c); langRef.current = c
    say(A_GREET[c])
  }

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setHint('Voice input needs Chrome — type your question below instead!'); return }
    if (listening) { recRef.current?.stop(); return }
    const rec = new SR()
    recRef.current = rec
    rec.lang = langRef.current
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => { const q = e.results[0][0].transcript; setHint(`You said: "${q}"`); ask(q) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setHint('Could not hear you — try again or type below.')
    try { rec.start(); setListening(true); setHint('Listening… speak now') } catch { /* already started */ }
  }

  return (
    <div className="aaria-hero">
      <div className="rv">
        <div className="aaria-orb-wrap" style={{ minHeight: 290 }}>
          <div className="aaria-ring" /><div className="aaria-ring" style={{ animationDelay: '1.1s' }} /><div className="aaria-ring" style={{ animationDelay: '2.2s' }} />
          <div className="aaria-orb" />
          <div className="aaria-orb-core">🎙️</div>
        </div>
        <div className={`wave ${waving || listening ? '' : 'idle'}`}>
          {[0, .1, .2, .3, .4, .5, .6].map(d => <i key={d} style={{ animationDelay: `${d}s` }} />)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button className={`mic-btn ${listening ? 'listening' : ''}`} title="Tap and speak" onClick={mic}>{listening ? '👂' : '🎤'}</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text3)', marginTop: 12 }}>{hint}</p>
      </div>
      <div className="rv d1">
        <div className="langchips">
          {A_LANGS.map(l => (
            <span key={l.c} className={`langchip ${l.c === lang ? 'on' : ''}`} onClick={() => pickLang(l.c)}>{l.l}</span>
          ))}
        </div>
        <div className="aaria-console">
          <div className="aline"><b>Aaria ›</b> <span>{out}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { ask(input); setInput('') } }}
            placeholder="…or type your question here"
            style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--stroke)', background: 'var(--chipbg)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: '.88rem', outline: 'none' }}
          />
          <button className="btn btn-primary" onClick={() => { ask(input); setInput('') }}>Ask ✦</button>
        </div>
        <p className="aaria-try">try: &quot;what is quietkeep&quot; · &quot;warranty app&quot; · &quot;book a venue&quot; · &quot;compare prices&quot; · &quot;school os&quot;</p>
      </div>
    </div>
  )
}
