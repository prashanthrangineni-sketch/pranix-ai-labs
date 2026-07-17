'use client'

import React, { useState } from 'react'
import { Mic, Send, Volume2, Shield, Settings, Play, CheckCircle } from 'lucide-react'

export function AariaControlsWidget() {
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'te'>('en')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [listening, setListening] = useState(false)

  async function handleUnderstand() {
    if (!text.trim()) return
    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const res = await fetch('/api/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang_hint: lang })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult(data)
        // If voice/speak returned audio, we can try playing it back
        if (data.visual_companion && data.visual_companion.audio) {
          const audio = new Audio(data.visual_companion.audio)
          audio.play().catch(() => {})
        }
      } else {
        setErrorMsg(data.error || 'Aaria failed to understand request.')
      }
    } catch {
      setErrorMsg('Failed to connect to Aaria API Proxy.')
    } finally {
      setLoading(false)
    }
  }

  function toggleListening() {
    setListening(!listening)
    if (!listening) {
      // Simulate speech recognition transcription after 2s
      setTimeout(() => {
        setText(lang === 'te' ? 'నమస్కారం, మీ పని పూర్తయింది.' : 'show student lesson overview')
        setListening(false)
      }, 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-fg-secondary">
          Voice Control Plane proxy interface for testing Aaria's NLU parsing and speech synthesis.
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-bg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
              listening
                ? 'bg-severity-critical text-white animate-pulse'
                : 'bg-surface border border-border-subtle text-fg-secondary hover:text-accent hover:border-accent'
            }`}
            title={listening ? 'Listening...' : 'Start Voice Test'}
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnderstand()}
            placeholder={
              listening
                ? 'Listening to speech...'
                : 'Type query (e.g. "pronounce hello", "show lesson stats")...'
            }
            disabled={listening}
            className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg-primary focus:outline-none focus:border-accent"
          />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-fg-primary focus:outline-none"
          >
            <option value="en">EN</option>
            <option value="te">TE</option>
          </select>
          <button
            onClick={handleUnderstand}
            disabled={loading || !text.trim()}
            className="h-8.5 px-3 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3 w-3" />
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-severity-critical">{errorMsg}</p>
        )}

        {result && (
          <div className="bg-surface rounded-lg border border-border-subtle p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
              <span className="text-[11px] font-bold text-fg-primary uppercase tracking-wide">
                NLU Resolution
              </span>
              <span className="text-[10px] text-fg-disabled font-mono">
                confidence: {result.confidence ? (result.confidence * 100).toFixed(0) + '%' : '100%'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-fg-disabled block text-[10px] uppercase font-mono">Resolved Intent</span>
                <span className="font-semibold text-fg-primary font-mono bg-bg px-1.5 py-0.5 rounded inline-block mt-0.5 border border-border-subtle">
                  {result.intent || 'unknown'}
                </span>
              </div>
              <div>
                <span className="text-fg-disabled block text-[10px] uppercase font-mono">Engine Used</span>
                <span className="font-semibold text-fg-primary font-mono bg-bg px-1.5 py-0.5 rounded inline-block mt-0.5 border border-border-subtle">
                  {result.engine_used || 'aaria-agent:router:v2'}
                </span>
              </div>
            </div>

            {result.entities && Object.keys(result.entities).length > 0 && (
              <div className="mt-1">
                <span className="text-fg-disabled block text-[10px] uppercase font-mono mb-1">Entities</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(result.entities).map(([k, v]: any) => (
                    <span
                      key={k}
                      className="text-[10px] font-mono bg-accent-subtle text-accent px-1.5 py-0.5 rounded"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.visual_companion && (
              <div className="border-t border-border-subtle pt-2 mt-2 space-y-1">
                <span className="text-fg-disabled block text-[10px] uppercase font-mono">
                  Visual Companion & Audio
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-bg px-2 py-1 rounded border border-border-subtle text-fg-secondary">
                    "{result.visual_companion.caption || 'Got it, processing.'}"
                  </div>
                  {result.visual_companion.expression && (
                    <span className="bg-accent-subtle text-accent text-[10px] font-bold px-2 py-1 rounded">
                      {result.visual_companion.expression}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
