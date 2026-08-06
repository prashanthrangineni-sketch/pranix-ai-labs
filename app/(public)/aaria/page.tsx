import type { Metadata } from 'next'
import AariaDemo from '@/components/public/AariaDemo'
import { SectionHead } from '@/components/public/cards'

export const metadata: Metadata = { title: 'Aaria Voice — Pranix AI Labs', description: 'Pranix Aaria — the multilingual voice engine running every Pranix product. Try the live demo.' }

export default function AariaPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="Pranix Aaria" title={<>The <span className="grad-text">voice</span> that runs Pranix</>}
        sub="Aaria is our in-house multilingual voice engine — Indian-language speech recognition, translation and speech synthesis on a Bhashini-first, provider-neutral stack. She lives inside every Pranix product." />
      <AariaDemo />
      <div className="grid g3" style={{ marginTop: 64 }}>
        <div className="icard rv"><span className="iemj">🗣️</span><h3>Indian languages first</h3><p>Built on India&apos;s Bhashini language stack with multi-provider failover — English, हिंदी, తెలుగు today; more Indian languages rolling out.</p></div>
        <div className="icard rv d1"><span className="iemj">⚡</span><h3>Voice that acts</h3><p>Tier-1 voice queries are live in EdProSys across all six school roles. Tier-2 voice actions — attendance by voice, notifications by voice — are next.</p></div>
        <div className="icard rv d2"><span className="iemj">🕸️</span><h3>Every product, one engine</h3><p>The same Aaria core rolls out across QuietKeep, Cart2Save, EdGridAI, QuickScanZ and EasyVenuez — learn her once, use her everywhere.</p></div>
      </div>
    </section>
  )
}
