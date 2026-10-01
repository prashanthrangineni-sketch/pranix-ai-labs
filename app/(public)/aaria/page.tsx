import type { Metadata } from 'next'
import Link from 'next/link'
import AariaDemo from '@/components/public/AariaDemo'
import { SectionHead } from '@/components/public/cards'

export const metadata: Metadata = { title: 'Aaria Voice — Pranix AI Labs', description: 'Pranix Aaria — the multilingual voice engine running every Pranix product. Try the live demo.' }

export default function AariaPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Pranix Aaria" title={<>The <span className="grad-text">voice</span> that runs Pranix</>}
        sub="Aaria is our in-house multilingual voice engine — Indian-language speech recognition, translation and speech synthesis on a provider-neutral stack that routes each language to whatever measured best. She lives inside every Pranix product." />
      <AariaDemo />
      <div className="grid g3" style={{ marginTop: 64 }}>
        <div className="icard rv"><span className="iemj">🗣️</span><h3>Indian languages first</h3><p>English, हिंदी, తెలుగు today — measured on recordings of real people, and on the phone itself with no internet. <Link href="/aaria/numbers">See the numbers</Link>.</p></div>
        <div className="icard rv d1"><span className="iemj">⚡</span><h3>Voice that acts</h3><p>In QuietKeep, Aaria saves spoken notes and reminders and places calls by voice, with a few seconds to cancel before it dials. More actions across Pranix products are next.</p></div>
        <div className="icard rv d2"><span className="iemj">🕸️</span><h3>Every product, one engine</h3><p>The same Aaria core rolls out across QuietKeep, Cart2Save, EdGridAI, QuickScanZ and EasyVenuez — learn her once, use her everywhere.</p></div>
      </div>
    </section>
  )
}
