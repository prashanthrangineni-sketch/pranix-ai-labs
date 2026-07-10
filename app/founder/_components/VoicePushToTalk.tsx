'use client'

// Command Centre Phase 1 (task #29): push-to-talk voice-in on the Mission Inbox.
// Uses the browser's built-in SpeechRecognition (Chrome/Edge — the founder's
// environment) so Phase 1 ships with ZERO backend changes and zero credentials.
// The transcript hands off to the existing Ask Pranix chat (/founder/ask?q=…)
// and is also copied to the clipboard as a belt-and-braces fallback.
// Aaria server-side STT (Sarvam primary) replaces the browser engine in Phase 2
// per the hybrid-voice architecture.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Send, X } from 'lucide-react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  return new Ctor() as SpeechRecognitionLike
}

const LANGS = [
  { code: 'en-IN', label: 'EN' },
  { code: 'te-IN', label: 'తె' },
  { code: 'hi-IN', label: 'हि' },
]

export default function VoicePushToTalk() {
  const router = useRouter()
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en-IN')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')

  useEffect(() => {
    setSupported(getRecognition() !== null)
    return () => {
      recRef.current?.abort()
    }
  }, [])

  const startListening = () => {
    const rec = getRecognition()
    if (!rec) {
      setSupported(false)
      return
    }
    recRef.current?.abort()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) setTranscript((prev) => (prev ? prev + ' ' : '') + finalText.trim())
      setInterim(interimText)
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopListening = () => {
    recRef.current?.stop()
    setListening(false)
  }

  const sendToAsk = () => {
    const q = transcript.trim()
    if (!q) return
    stopListening()
    // Fallback: keep the words available even if the Ask surface doesn't
    // auto-consume the query param yet.
    try {
      void navigator.clipboard?.writeText(q)
    } catch {
      /* non-fatal */
    }
    router.push(`/founder/ask?q=${encodeURIComponent(q)}`)
  }

  if (!supported) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-3 text-xs text-fg-muted">
        Voice input needs Chrome or Edge on this device — open the Pranix app in one of those to speak commands.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={listening ? stopListening : startListening}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
            listening
              ? 'bg-severity-critical/20 border-severity-critical text-fg-primary animate-pulse'
              : 'bg-elevated border-border-subtle text-fg-primary hover:bg-canvas'
          }`}
        >
          {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {listening ? 'Listening… tap to stop' : 'Speak to Pranix'}
        </button>

        <div className="flex items-center gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded px-2 py-1 text-[10px] border ${
                lang === l.code
                  ? 'border-fg-muted text-fg-primary bg-canvas'
                  : 'border-border-subtle text-fg-disabled hover:text-fg-muted'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {(transcript || interim) && (
        <div className="rounded-md bg-canvas p-2">
          <p className="text-xs text-fg-secondary leading-relaxed">
            {transcript}
            {interim && <span className="text-fg-disabled italic"> {interim}</span>}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={sendToAsk}
              className="inline-flex items-center gap-1 rounded-md bg-elevated px-2.5 py-1 text-[11px] font-medium text-fg-primary border border-border-subtle hover:bg-surface"
            >
              <Send className="h-3 w-3" /> Ask Pranix
            </button>
            <button
              onClick={() => {
                setTranscript('')
                setInterim('')
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-fg-muted hover:text-fg-primary"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
