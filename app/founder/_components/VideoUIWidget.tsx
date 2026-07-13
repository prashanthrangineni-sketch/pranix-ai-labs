'use client'

import React, { useState } from 'react'
import { Play, Video, Loader2, Sparkles, AlertCircle } from 'lucide-react'

export function VideoUIWidget() {
  const [batchFile, setBatchFile] = useState('EdGridAI_Real_Questions_Batch1_EN_TE.md')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const batches = [
    'EdGridAI_Real_Questions_Batch1_EN_TE.md',
    'EdGridAI_Real_Questions_Batch2_EN_TE.md',
    'EdGridAI_Real_Questions_Batch3_EN_TE.md',
    'EdGridAI_Real_Questions_Batch4_EN_TE.md',
    'EdGridAI_Real_Questions_Batch5_EN_TE.md'
  ]

  async function handleGenerate() {
    setGenerating(true)
    setErrorMsg('')
    setSuccessMsg('')
    setVideoUrl(null)

    try {
      // Simulate explainer generation trigger
      setTimeout(() => {
        setGenerating(false)
        setSuccessMsg(`Successfully generated explainer Shorts for Batch 1 Question 1!`)
        // Mock horizontal/vertical video link
        setVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-screen-with-text-and-charts-34283-large.mp4')
      }, 3000)
    } catch {
      setErrorMsg('Failed to run generation pipeline.')
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-fg-secondary">
          Configure and compile vertical explainer videos (9:16) from educational Misconception Question batches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="rounded-lg border border-border-subtle bg-bg p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-fg-disabled uppercase block mb-1.5">
                Misconception MCQ Batch
              </label>
              <select
                value={batchFile}
                onChange={(e) => setBatchFile(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-1.8 text-xs text-fg-primary focus:outline-none focus:border-accent"
              >
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b.replace('EdGridAI_Real_Questions_', '')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-fg-disabled uppercase block mb-1.5">
                Question Index
              </label>
              <select
                value={questionIndex}
                onChange={(e) => setQuestionIndex(Number(e.target.value))}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-1.8 text-xs text-fg-primary focus:outline-none focus:border-accent"
              >
                {[...Array(15)].map((_, i) => (
                  <option key={i} value={i}>
                    Question {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-9 rounded-lg bg-accent text-white text-xs font-semibold flex items-center justify-center gap-1.8 hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Compiling Pipeline Assets...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Explainer Video
                </>
              )}
            </button>
            {successMsg && (
              <p className="text-[11px] font-medium text-severity-success text-center mt-1">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-[11px] font-medium text-severity-critical text-center mt-1">
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        {/* Video Player */}
        <div className="rounded-lg border border-border-subtle bg-surface p-3 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full max-w-[140px] aspect-[9/16] bg-black rounded-lg border border-border-subtle shadow-md"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <div className="h-10 w-10 rounded-full bg-bg flex items-center justify-center mx-auto text-fg-secondary">
                <Video className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-fg-primary">No Video Generated Yet</p>
              <p className="text-[11px] text-fg-disabled max-w-[200px] mx-auto">
                Trigger video generation to render the 9:16 Shorts format explainer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
