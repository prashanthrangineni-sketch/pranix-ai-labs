import type { Metadata } from 'next'
import { AskChat } from './ask-chat'

export const metadata: Metadata = { title: 'Ask Pranix' }
export const dynamic = 'force-dynamic'

export default function AskPranixPage() {
  return <AskChat />
}
