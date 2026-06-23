import type { Metadata } from 'next'
import { getControlPlane } from '@/app/lib/control-plane'
import { TokensClient } from './tokens-client'

export const metadata: Metadata = { title: 'API & Gateway Tokens' }

export default async function FounderTokensPage() {
  const db = getControlPlane()
  const { data: clients } = await db
    .from('mcp_clients')
    .select('id, client_name, display_name, token_prefix, active, is_founder, rate_limit_per_hour, vendor_hint, notes, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6">
      <TokensClient initialClients={clients || []} />
    </div>
  )
}
