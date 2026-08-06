import type { Metadata } from 'next'
import { ProductCard, SectionHead } from '@/components/public/cards'
import { PRODUCTS } from '@/lib/public/data'

export const metadata: Metadata = { title: 'Products — Pranix AI Labs' }

export default function ProductsPage() {
  return (
    <section className="block wrap">
      <SectionHead kicker="The lineup" title={<>Every product, <span className="grad-text">up close</span></>}
        sub="From school operating systems to honest price engines — each product ships with its own domain, its own design language, and a Google Play journey." />
      <div className="grid g2">
        {PRODUCTS.map(p => <ProductCard key={p.id} p={p} full />)}
      </div>
    </section>
  )
}
