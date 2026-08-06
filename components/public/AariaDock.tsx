'use client'
// components/public/AariaDock.tsx — anime Aaria mascot + assistant chat with human-support handoff
import { useRef, useState } from 'react'
import { aariaAnswer } from '@/lib/public/data'

type Msg = { who: 'bot' | 'me'; html: string }

const linkify = (t: string) =>
  t.replace(/95154 79595/g, '<a href="tel:+919515479595">95154 79595</a>')

export default function AariaDock() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const greeted = useRef(false)

  const push = (m: Msg) => {
    setMsgs(prev => [...prev, m])
    setTimeout(() => { logRef.current && (logRef.current.scrollTop = logRef.current.scrollHeight) }, 30)
  }

  const toggle = () => {
    setOpen(o => !o)
    if (!greeted.current) {
      greeted.current = true
      push({ who: 'bot', html: "Heyy! I'm <b>Aaria</b> ✨ your Pranix assistant. Ask me about any product, our services, or tap <b>Human support</b> to reach a real person!" })
    }
  }

  const ask = (q: string) => {
    if (!q.trim()) return
    push({ who: 'me', html: q.replace(/</g, '&lt;') })
    setInput('')
    setTimeout(() => push({ who: 'bot', html: linkify(aariaAnswer(q)) }), 550)
  }

  const human = () => {
    push({ who: 'me', html: 'Human support 📞' })
    push({ who: 'bot', html: 'Of course! Reach a real human here:<br>📞 <a href="tel:+919515479595">+91 95154 79595</a><br>💬 <a href="https://wa.me/919515479595" target="_blank" rel="noopener noreferrer">WhatsApp us</a><br>📮 <a href="mailto:support@pranixailabs.com">support@pranixailabs.com</a><br>We reply fast — promise! 🤞' })
  }

  return (
    <>
      <div className="mascot" title="Ask Aaria" onClick={toggle}>
        <div className="bubble">Ask me — I&apos;m Aaria, your assistant ✨</div>
        <svg width="92" height="98" viewBox="0 0 92 98" fill="none">
          <defs>
            <linearGradient id="amg" x1="0" y1="0" x2="92" y2="98"><stop stopColor="#a78bfa" /><stop offset=".55" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
            <linearGradient id="amh" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c4b5fd" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
          </defs>
          <ellipse cx="46" cy="94" rx="26" ry="4" fill="rgba(0,0,0,.28)" />
          <path d="M46 14 C42 8 48 3 53 6" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="55" cy="5" r="3.4" fill="#f472b6"><animate attributeName="fill" values="#f472b6;#fbbf24;#22d3ee;#f472b6" dur="2.6s" repeatCount="indefinite" /></circle>
          <path d="M14 46 C12 22 30 12 46 12 C62 12 80 22 78 46 C78 54 74 58 70 60 L22 60 C18 58 14 54 14 46Z" fill="url(#amh)" />
          <ellipse cx="46" cy="46" rx="26" ry="22" fill="#fff7f2" />
          <g className="aeye"><ellipse cx="36" cy="45" rx="6.4" ry="8" fill="#2d1b69" /><circle cx="38" cy="42" r="2.4" fill="#fff" /><circle cx="34.6" cy="47.5" r="1.2" fill="#22d3ee" /></g>
          <g className="aeye"><ellipse cx="56" cy="45" rx="6.4" ry="8" fill="#2d1b69" /><circle cx="58" cy="42" r="2.4" fill="#fff" /><circle cx="54.6" cy="47.5" r="1.2" fill="#22d3ee" /></g>
          <ellipse cx="27" cy="52" rx="4.4" ry="2.4" fill="#f9a8d4" opacity=".75" />
          <ellipse cx="65" cy="52" rx="4.4" ry="2.4" fill="#f9a8d4" opacity=".75" />
          <path d="M41 55 Q46 59.5 51 55" stroke="#ec4899" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M16 44 C16 24 32 16 46 16 C60 16 76 24 76 44" stroke="url(#amg)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <rect x="10" y="40" width="9" height="16" rx="4.5" fill="url(#amg)" />
          <rect x="73" y="40" width="9" height="16" rx="4.5" fill="url(#amg)" />
          <path d="M78 56 C78 64 68 67 60 67" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="58" cy="67" r="3" fill="#22d3ee" />
          <path d="M30 66 C30 62 62 62 62 66 L64 82 C64 90 28 90 28 82 Z" fill="url(#amg)" />
          <circle cx="46" cy="76" r="4.6" fill="#fff" opacity=".92" />
          <path d="M44 76 l1.6 1.8 3-3.6" stroke="#8b5cf6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path className="spk" d="M84 26 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4-3.6 -3.6-1.4 3.6-1.4z" fill="#fbbf24" />
          <path className="spk2" d="M8 20 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1-2.6 -2.6-1 2.6-1z" fill="#22d3ee" />
        </svg>
      </div>

      {open && (
        <div className="chatdock">
          <div className="cd-head">
            <span className="cd-ava">✨</span>
            <div><b>Aaria</b><div className="cd-status"><span className="cd-dot" />online · EN हिं తె</div></div>
            <button className="cd-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="cd-log" ref={logRef}>
            {msgs.map((m, i) => <div key={i} className={`cd-msg ${m.who}`} dangerouslySetInnerHTML={{ __html: m.html }} />)}
          </div>
          <div className="cd-chips">
            <span className="cd-chip" onClick={() => ask('Tell me about your products')}>🛍️ Products</span>
            <span className="cd-chip" onClick={() => ask('What services do you offer')}>🛠️ Services</span>
            <span className="cd-chip" onClick={() => ask('Who is Aaria')}>🎙️ Aaria</span>
            <span className="cd-chip" onClick={human}>📞 Human support</span>
          </div>
          <div className="cd-inputrow">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(input)} placeholder="Ask me anything…" />
            <button onClick={() => ask(input)}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
