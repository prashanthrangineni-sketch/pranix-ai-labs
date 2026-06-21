// app/api/cron/credential-health/route.ts
import { NextResponse } from 'next/server'
import { getControlPlane } from '@/app/lib/control-plane'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function checkGithubPat(pat: string, accountOwner: string | null, db: any) {
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${pat}`,
        'User-Agent': 'Pranix-Credential-Checker/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!userRes.ok) {
      return {
        status: 'invalid',
        expiresAt: null,
        notes: `GitHub API error: ${userRes.status} ${userRes.statusText}`
      }
    }

    const expHeader = userRes.headers.get('github-authentication-token-expiration')
    let expiresAt: string | null = null
    if (expHeader) {
      try {
        expiresAt = new Date(expHeader).toISOString()
      } catch {}
    }

    if (!accountOwner) {
      return { status: 'valid', expiresAt, notes: null }
    }

    // Per-repo reachability check
    const { data: repos, error: reposErr } = await db
      .from('product_repos')
      .select('github_repo')
      .eq('account_owner', accountOwner)
      .eq('is_active', true)

    if (reposErr) {
      return {
        status: 'valid',
        expiresAt,
        notes: `Could not fetch product_repos: ${reposErr.message}`
      }
    }

    const unreachable: string[] = []
    if (repos && repos.length > 0) {
      for (const r of repos) {
        const repoPath = r.github_repo
        if (!repoPath) continue
        const repoRes = await fetch(`https://api.github.com/repos/${repoPath}`, {
          headers: {
            'Authorization': `token ${pat}`,
            'User-Agent': 'Pranix-Credential-Checker/1.0',
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        if (!repoRes.ok) {
          unreachable.push(repoPath)
        }
      }
    }

    if (unreachable.length > 0) {
      return {
        status: 'degraded',
        expiresAt,
        notes: `Unreachable repos: ${unreachable.join(', ')}`
      }
    }

    return {
      status: 'valid',
      expiresAt,
      notes: null
    }
  } catch (err: any) {
    return {
      status: 'unknown',
      notes: `Network error: ${err?.message || String(err)}`
    }
  }
}

async function checkVercelToken(token: string) {
  try {
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (res.ok) {
      return { status: 'valid', notes: null }
    }
    return {
      status: 'invalid',
      notes: `Vercel API error: ${res.status} ${res.statusText}`
    }
  } catch (err: any) {
    return { status: 'unknown', notes: `Network error: ${err?.message || String(err)}` }
  }
}

async function checkSupabaseKey(db: any) {
  try {
    const { error } = await db.from('dashboard_founders').select('email').limit(1)
    if (error) {
      return {
        status: 'invalid',
        notes: `Supabase query error: ${error.message}`
      }
    }
    return { status: 'valid', notes: null }
  } catch (err: any) {
    return {
      status: 'invalid',
      notes: `Supabase client error: ${err?.message || String(err)}`
    }
  }
}

async function checkGatewayBearer(bearer: string) {
  try {
    const res = await fetch('https://pranix-agent-engine.vercel.app/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'health-check',
        method: 'tools/call',
        params: {
          name: 'mcp_list_projects',
          arguments: {}
        }
      })
    })

    if (!res.ok) {
      return { status: 'invalid', notes: `Gateway HTTP error: ${res.status}` }
    }

    const payload = await res.json()
    if (payload.error) {
      return { status: 'invalid', notes: `Gateway API error: ${payload.error.message}` }
    }

    return { status: 'valid', notes: null }
  } catch (err: any) {
    return {
      status: 'invalid',
      notes: `Gateway connection error: ${err?.message || String(err)}`
    }
  }
}

async function checkAnthropic(key: string) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: 'h' }],
        max_tokens: 1
      })
    })
    if (res.status === 401 || res.status === 403) {
      return { status: 'invalid', notes: 'Anthropic API key is invalid' }
    }
    return { status: 'valid', notes: null }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

async function checkOpenAi(key: string) {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    })
    if (res.status === 200) return { status: 'valid', notes: null }
    if (res.status === 401 || res.status === 403) return { status: 'invalid', notes: 'OpenAI API key is invalid' }
    return { status: 'unknown', notes: `OpenAI response code: ${res.status}` }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

async function checkDeepSeek(key: string) {
  try {
    const res = await fetch('https://api.deepseek.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    })
    if (res.status === 200) return { status: 'valid', notes: null }
    if (res.status === 401 || res.status === 403) return { status: 'invalid', notes: 'DeepSeek API key is invalid' }
    return { status: 'unknown', notes: `DeepSeek response code: ${res.status}` }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

async function checkGemini(key: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    if (res.status === 200) return { status: 'valid', notes: null }
    if (res.status === 400 || res.status === 403 || res.status === 401) {
      return { status: 'invalid', notes: 'Gemini API key is invalid' }
    }
    return { status: 'unknown', notes: `Gemini response: ${res.status}` }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

async function checkResend(key: string) {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${key}` }
    })
    if (res.status === 200) return { status: 'valid', notes: null }
    if (res.status === 401 || res.status === 403) return { status: 'invalid', notes: 'Resend API key is invalid' }
    return { status: 'unknown', notes: `Resend response code: ${res.status}` }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

async function checkOneSignal(key: string) {
  try {
    const res = await fetch('https://onesignal.com/api/v1/apps', {
      headers: { 'Authorization': `Basic ${key}` }
    })
    if (res.status === 200) return { status: 'valid', notes: null }
    if (res.status === 401 || res.status === 403) return { status: 'invalid', notes: 'OneSignal API key is invalid' }
    return { status: 'unknown', notes: `OneSignal response code: ${res.status}` }
  } catch (e: any) {
    return { status: 'unknown', notes: `Network error: ${e?.message || String(e)}` }
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const db = getControlPlane()
  const { data: creds, error: fetchErr } = await db
    .from('credential_health')
    .select('*')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const results: any[] = []

  for (const cred of creds ?? []) {
    let checkRes: { status: string; notes?: string | null; expiresAt?: string | null } = {
      status: 'unknown',
      notes: 'No checker implemented'
    }

    try {
      if (cred.provider === 'github') {
        const patName = cred.name === 'github_pat_pranixailabs' ? 'GITHUB_PAT' : 'GITHUB_SECONDARY_PAT'
        const pat = process.env[patName]
        if (!pat) {
          checkRes = { status: 'unknown', notes: `Environment variable ${patName} not set` }
        } else {
          checkRes = await checkGithubPat(pat, cred.account_owner, db)
        }
      } else if (cred.provider === 'vercel') {
        const token = process.env.VERCEL_TOKEN
        if (!token) {
          checkRes = { status: 'unknown', notes: 'Environment variable VERCEL_TOKEN not set' }
        } else {
          checkRes = await checkVercelToken(token)
        }
      } else if (cred.provider === 'supabase') {
        checkRes = await checkSupabaseKey(db)
      } else if (cred.provider === 'pranix_agents') {
        const bearer = process.env.PRANIX_FOUNDER_BEARER
        if (!bearer) {
          checkRes = { status: 'unknown', notes: 'Environment variable PRANIX_FOUNDER_BEARER not set' }
        } else {
          checkRes = await checkGatewayBearer(bearer)
        }
      } else if (cred.provider === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'ANTHROPIC_API_KEY not set' }
        else checkRes = await checkAnthropic(key)
      } else if (cred.provider === 'openai') {
        const key = process.env.OPENAI_API_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'OPENAI_API_KEY not set' }
        else checkRes = await checkOpenAi(key)
      } else if (cred.provider === 'deepseek') {
        const key = process.env.DEEPSEEK_API_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'DEEPSEEK_API_KEY not set' }
        else checkRes = await checkDeepSeek(key)
      } else if (cred.provider === 'google') {
        const key = process.env.GEMINI_API_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'GEMINI_API_KEY not set' }
        else checkRes = await checkGemini(key)
      } else if (cred.provider === 'resend') {
        const key = process.env.RESEND_API_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'RESEND_API_KEY not set' }
        else checkRes = await checkResend(key)
      } else if (cred.provider === 'onesignal') {
        const key = process.env.ONESIGNAL_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'ONESIGNAL_KEY not set' }
        else checkRes = await checkOneSignal(key)
      } else if (cred.provider === 'cuelinks') {
        const token = process.env.CUELINKS_TOKEN
        if (!token) checkRes = { status: 'unknown', notes: 'CUELINKS_TOKEN not set' }
        else checkRes = { status: 'valid', notes: 'Cuelinks token configured' }
      } else if (cred.provider === 'razorpay') {
        const key = process.env.RAZORPAY_KEY
        if (!key) checkRes = { status: 'unknown', notes: 'RAZORPAY_KEY not set' }
        else checkRes = { status: 'valid', notes: 'Razorpay key configured' }
      }
    } catch (e: any) {
      checkRes = { status: 'unknown', notes: `Unexpected check error: ${e?.message || String(e)}` }
    }

    const updateData: any = {
      status: checkRes.status,
      notes: checkRes.notes ?? null,
      last_checked: new Date().toISOString()
    }
    if (checkRes.expiresAt) {
      updateData.expires_at = checkRes.expiresAt
    }

    const { error: updateErr } = await db
      .from('credential_health')
      .update(updateData)
      .eq('id', cred.id)

    results.push({
      id: cred.id,
      name: cred.name,
      status: checkRes.status,
      notes: checkRes.notes,
      error: updateErr ? updateErr.message : null
    })
  }

  return NextResponse.json({ ok: true, checked: results })
}
