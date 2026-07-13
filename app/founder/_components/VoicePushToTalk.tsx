'use client'

// Command Centre Phase 2: push-to-talk voice-in on the Mission Inbox.
// Captures mic audio using standard browser MediaRecorder, encodes as base64 webm/wav,
// and POSTs to /api/founder/command for server-side Aaria STT transcription and routing.
// If the command result includes synthesized speech feedback, it plays it back immediately.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Send, X, Loader2 } from 'lucide-react'

const LANGS = [
  { code: 'en-IN', label: 'EN' },
  { code: 'te-IN', label: 'తె' },
  { code: 'hi-IN', label: 'हि' },
]

export default function VoicePushToTalk() {
  const router = useRouter()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [lang, setLang] = useState('en-IN')
  const [transcript, setTranscript] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

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
      setStatusMsg('Accessing microphone…')
      audioChunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const options = { mimeType: 'audio/webm' }
      let mediaRecorder: MediaRecorder
      
      try {
        mediaRecorder = new MediaRecorder(stream, options)
      } catch {
        // Fallback to default if webm is not supported (e.g. Safari)
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
      mediaRecorder.start(250) // collect chunks every 250ms
      setRecording(true)
      setStatusMsg('Listening… speak now, tap to stop.')
    } catch (err) {
      console.error('Failed to start recording:', err)
      setStatusMsg('Microphone access denied or unavailable.')
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
      setStatusMsg('Processing voice command…')
    }
  }

  const handleAudioSubmit = async (blob: Blob) => {
    setProcessing(true)
    try {
      // Convert blob to base64 string
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64data = reader.result as string
        // base64data starts with "data:audio/webm;base64,..."
        const base64Clean = base64data.split(',')[1]
        
        try {
          const res = await fetch('/api/founder/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64Clean,
              lang_hint: lang.split('-')[0], // e.g. "te" or "en"
              skip_approval: false
            })
          })
          
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}))
            throw new Error(errJson.error || 'Server processing error')
          }
          
          const data = await res.json()
          setTranscript(data.note || 'Command processed.')
          setStatusMsg('Success.')

          // Play synthesized feedback audio if present
          if (data.voice_out_audio) {
            const audio = new Audio(data.voice_out_audio)
            void audio.play().catch(e => console.warn('Audio auto-play prevented by browser policy:', e))
          }
        } catch (err: any) {
          console.error('Failed to submit voice command:', err)
          setStatusMsg(`Error: ${err.message || 'Server request failed'}`)
        } finally {
          setProcessing(false)
        }
      }
    } catch (err) {
      console.error('FileReader error:', err)
      setStatusMsg('Error encoding audio.')
      setProcessing(false)
    }
  }

  const sendToAsk = () => {
    const q = transcript.trim()
    if (!q) return
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
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 ${
            recording
              ? 'bg-severity-critical/20 border-severity-critical text-fg-primary animate-pulse'
              : 'bg-elevated border-border-subtle text-fg-primary hover:bg-canvas'
          }`}
        >
          {recording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? 'Stop Recording' : 'Speak to Pranix'}
        </button>

        <div className="flex items-center gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              disabled={recording || processing}
              className={`rounded px-2 py-1 text-[10px] border disabled:opacity-50 ${
                lang === l.code
                  ? 'border-fg-muted text-fg-primary bg-canvas'
                  : 'border-border-subtle text-fg-disabled hover:text-fg-muted'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {processing && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted ml-2">
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
            <span>Processing…</span>
          </div>
        )}
      </div>

      {statusMsg && (
        <p className="text-[10px] text-fg-disabled italic px-1">{statusMsg}</p>
      )}

      {transcript && (
        <div className="rounded-md bg-canvas p-2 space-y-2">
          <p className="text-xs text-fg-secondary leading-relaxed">
            {transcript}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={sendToAsk}
              className="inline-flex items-center gap-1 rounded-md bg-elevated px-2.5 py-1 text-[11px] font-medium text-fg-primary border border-border-subtle hover:bg-surface"
            >
              <Send className="h-3 w-3" /> Go to Ask Chat
            </button>
            <button
              onClick={() => {
                setTranscript('')
                setStatusMsg('')
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-fg-muted hover:text-fg-primary"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
