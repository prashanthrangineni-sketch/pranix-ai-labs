'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function IdeaCaptureHeader() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'te'>('en')
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' })

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia
    setSupported(!!isSupported)

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setStatus({ type: 'idle', msg: '' })
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const options = { mimeType: 'audio/webm' }
      let mediaRecorder: MediaRecorder

      try {
        mediaRecorder = new MediaRecorder(stream, options)
      } catch {
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        await handleAudioSubmit(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
      setRecording(true)
    } catch (err) {
      console.error('Mic access failed:', err)
      setStatus({ type: 'error', msg: 'Microphone access denied' })
      setRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setRecording(false)
    }
  }

  const handleAudioSubmit = async (blob: Blob) => {
    setLoading(true)
    setStatus({ type: 'idle', msg: '' })
    try {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64data = reader.result as string
        const base64Clean = base64data.split(',')[1]

        const res = await fetch('/api/founder/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Clean,
            lang_hint: lang,
          })
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Transcription failed')
        }

        const data = await res.json()
        setText(data.idea?.text || '')
        setStatus({ type: 'success', msg: 'Voice idea captured successfully!' })
      }
    } catch (err: any) {
      console.error(err)
      setStatus({ type: 'error', msg: err.message || 'Failed to capture voice idea' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!text.trim() || loading) return

    setLoading(true)
    setStatus({ type: 'idle', msg: '' })
    try {
      const res = await fetch('/api/founder/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Submit failed')
      }

      setText('')
      setStatus({ type: 'success', msg: 'Idea captured successfully!' })
    } catch (err: any) {
      console.error(err)
      setStatus({ type: 'error', msg: err.message || 'Failed to submit idea' })
    } finally {
      setLoading(false)
    }
  }

  // Clear status after 3 seconds
  useEffect(() => {
    if (status.type !== 'idle') {
      const t = setTimeout(() => {
        setStatus({ type: 'idle', msg: '' })
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [status])

  if (!supported) return null

  return (
    <div className="relative flex items-center gap-2">
      {/* Status toast notification */}
      {status.type !== 'idle' && (
        <div className={`absolute top-10 right-0 z-50 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium border shadow-sm transition-all duration-200 ${
          status.type === 'success' 
            ? 'bg-severity-success/15 border-severity-success/30 text-severity-success' 
            : 'bg-severity-critical/15 border-severity-critical/30 text-severity-critical'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span>{status.msg}</span>
        </div>
      )}

      {/* Main UI */}
      <form onSubmit={handleSubmitText} className="flex items-center gap-1.5 bg-canvas border border-border-subtle rounded-lg px-2 py-1 max-w-[280px] sm:max-w-[360px] transition-colors focus-within:border-accent">
        {/* Mic toggle */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            recording 
              ? 'bg-severity-critical text-canvas animate-pulse' 
              : 'text-fg-secondary hover:text-accent hover:bg-elevated'
          }`}
          title={recording ? 'Stop Recording' : 'Record Voice Idea'}
        >
          {recording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={recording || loading}
          placeholder={recording ? 'Listening... Speak now.' : 'Capture new idea...'}
          className="bg-transparent border-0 text-xs text-fg-primary focus:outline-none w-full placeholder:text-fg-disabled"
        />

        {/* Language selector for Voice STT */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          disabled={recording || loading}
          className="bg-transparent text-[10px] text-fg-muted hover:text-fg-primary focus:outline-none cursor-pointer pr-1 shrink-0 font-medium uppercase"
          title="Voice Language Hint"
        >
          <option value="en" className="bg-surface text-fg-primary">EN</option>
          <option value="te" className="bg-surface text-fg-primary">తె</option>
        </select>

        {/* Submit action */}
        <button
          type="submit"
          disabled={recording || loading || !text.trim()}
          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-fg-secondary hover:text-accent hover:bg-elevated disabled:opacity-30 disabled:hover:bg-transparent"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </form>
    </div>
  )
}
