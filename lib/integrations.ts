import { getControlPlane } from '@/app/lib/control-plane'

export type IntegrationCategory =
  | 'Infrastructure'
  | 'Messaging'
  | 'Identity'
  | 'AI Models'

export type Integration = {
  id: string
  name: string
  category: IntegrationCategory
  console_url: string
  // If set, this integration has a live row in provider_registry.
  providerKey?: string
}

// Static catalog — the 12 integrations. Console URLs are real deep links.
// "Live status" is only claimed where a real datasource backs it.
export const CATALOG: Integration[] = [
  { id: 'supabase',  name: 'Supabase',   category: 'Infrastructure', console_url: 'https://supabase.com/dashboard/projects' },
  { id: 'github',    name: 'GitHub',     category: 'Infrastructure', console_url: 'https://github.com/PranixQuick' },
  { id: 'vercel',    name: 'Vercel',     category: 'Infrastructure', console_url: 'https://vercel.com/dashboard' },
  { id: 'doppler',   name: 'Doppler',    category: 'Infrastructure', console_url: 'https://dashboard.doppler.com' },
  { id: 'twilio',    name: 'Twilio',     category: 'Messaging',      console_url: 'https://console.twilio.com' },
  { id: 'onesignal', name: 'OneSignal',  category: 'Messaging',      console_url: 'https://dashboard.onesignal.com' },
  { id: 'google',    name: 'Google',     category: 'Identity',       console_url: 'https://console.cloud.google.com' },
  { id: 'meta',      name: 'Meta',       category: 'Identity',       console_url: 'https://developers.facebook.com/apps' },
  { id: 'openrouter',name: 'OpenRouter', category: 'AI Models',      console_url: 'https://openrouter.ai/keys',        providerKey: 'openrouter' },
  { id: 'groq',      name: 'Groq',       category: 'AI Models',      console_url: 'https://console.groq.com/keys',     providerKey: 'groq' },
  { id: 'claude',    name: 'Claude',     category: 'AI Models',      console_url: 'https://console.anthropic.com',     providerKey: 'anthropic' },
  { id: 'gemini',    name: 'Gemini',     category: 'AI Models',      console_url: 'https://aistudio.google.com/apikey', providerKey: 'gemini' },
]

export type IntegrationStatus = Integration & {
  // monitored = we have a real live datasource for this integration
  monitored: boolean
  connected: boolean | null   // null when not monitored here
  health: string | null       // provider_registry.health_status, when monitored
  checked_at: string | null   // when health was last checked
  // token expiry is genuinely not stored for these integrations
  token_expiry: null
}

export type AccountHub = {
  groups: { category: IntegrationCategory; items: IntegrationStatus[] }[]
  monitoredCount: number
  connectedCount: number
}

const ORDER: IntegrationCategory[] = ['AI Models', 'Infrastructure', 'Messaging', 'Identity']

export async function getAccountHub(): Promise<AccountHub> {
  const db = getControlPlane()

  // Real signal for the 4 AI providers.
  const live = new Map<string, { enabled: boolean; health: string | null; checked_at: string | null }>()
  try {
    const { data } = await db
      .from('provider_registry')
      .select('provider_name, enabled, health_status, health_checked_at')
    for (const p of data ?? []) {
      live.set(p.provider_name, {
        enabled: !!p.enabled,
        health: p.health_status ?? null,
        checked_at: p.health_checked_at ?? null,
      })
    }
  } catch { /* fall through to unmonitored */ }

  const statuses: IntegrationStatus[] = CATALOG.map((c) => {
    const l = c.providerKey ? live.get(c.providerKey) : undefined
    if (l) {
      return {
        ...c,
        monitored: true,
        connected: l.enabled,
        health: l.health,
        checked_at: l.checked_at,
        token_expiry: null,
      }
    }
    return {
      ...c,
      monitored: false,
      connected: null,
      health: null,
      checked_at: null,
      token_expiry: null,
    }
  })

  const groups = ORDER.map((category) => ({
    category,
    items: statuses.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0)

  return {
    groups,
    monitoredCount: statuses.filter((s) => s.monitored).length,
    connectedCount: statuses.filter((s) => s.connected === true).length,
  }
}
