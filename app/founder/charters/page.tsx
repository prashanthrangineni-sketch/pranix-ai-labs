import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { getCharters } from '@/lib/charters'
import { CharterCard } from '../_components/CharterCard'

export const metadata: Metadata = { title: 'Charters' }
export const revalidate = 300

export default function ChartersPage() {
  const charters = getCharters()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <BookOpen className="h-5 w-5 text-accent" />
        <div>
          <h1 className="text-[15px] font-semibold text-fg-primary">Product Charters</h1>
          <p className="text-[12px] text-fg-muted">
            One page per product: what it is, what you need to do, what's actually verified live, and what's next.
            Shipped from content/charters/*.md — edit those files and this page updates on the next deploy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {charters.map((c) => (
          <CharterCard key={c.slug} charter={c} />
        ))}
      </div>
    </div>
  )
}
