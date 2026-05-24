import 'server-only'

/**
 * Pranix MCP HTTP wrapper — server-only.
 *
 * Routes mutation calls from the founder dashboard through the same MCP
 * surface that every other write in the Pranix ecosystem uses, rather than
 * giving the website direct service-role access to the control plane.
 *
 * STANDING RULE (Phase 2B):
 *   PRANIX_FOUNDER_BEARER must NEVER appear in client-side code.
 *   This module imports 'server-only', which causes a build-time error
 *   if it is ever imported into a Client Component bundle. Call sites
 *   must be server actions ('use server') or route handlers.
 *
 * Endpoint: https://pranix-agent-engine.vercel.app/api/mcp
 * Protocol: JSON-RPC 2.0 over HTTP (MCP standard tools/call shape).
 */

const PRANIX_MCP_ENDPOINT = 'https://pranix-agent-engine.vercel.app/api/mcp'

export type McpCallResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

/**
 * Low-level MCP tool call.
 *
 * @param toolName  Full MCP tool name (e.g. 'mcp_access_approve_grant').
 * @param args      Tool arguments object.
 * @returns         Discriminated result — never throws on transport / auth / tool errors.
 *                  Callers should switch on `ok`.
 */
export async function callPranixTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown>
): Promise<McpCallResult<T>> {
  const bearer = process.env.PRANIX_FOUNDER_BEARER
  if (!bearer) {
    return {
      ok: false,
      error: 'PRANIX_FOUNDER_BEARER is not set on this server environment',
    }
  }

  let response: Response
  try {
    response = await fetch(PRANIX_MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: cryptoRandomId(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
      // Mutations must never be cached by the Next data cache.
      cache: 'no-store',
    })
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'network error',
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return {
      ok: false,
      error: `MCP HTTP ${response.status}: ${text.slice(0, 200)}`,
      status: response.status,
    }
  }

  type JsonRpcResponse = {
    result?: { content?: Array<{ type: string; text?: string }>; isError?: boolean }
    error?: { message?: string; code?: number }
  }

  let payload: JsonRpcResponse
  try {
    payload = (await response.json()) as JsonRpcResponse
  } catch {
    return { ok: false, error: 'MCP returned non-JSON response' }
  }

  if (payload.error) {
    return {
      ok: false,
      error: payload.error.message || `JSON-RPC error code ${payload.error.code ?? 'unknown'}`,
    }
  }

  if (payload.result?.isError) {
    const text = payload.result.content?.[0]?.text ?? 'tool reported isError without message'
    return { ok: false, error: text }
  }

  // MCP servers return text content blocks; tool results are JSON-encoded text.
  const textBlock = payload.result?.content?.find((b) => b.type === 'text')?.text
  if (textBlock === undefined) {
    return { ok: true, data: undefined as T }
  }

  try {
    return { ok: true, data: JSON.parse(textBlock) as T }
  } catch {
    // Tool returned plain text — surface it as-is.
    return { ok: true, data: textBlock as unknown as T }
  }
}

// ─── Typed wrappers ───────────────────────────────────────────────

export type ApproveGrantArgs = {
  grant_id: string
  reason?: string
  override_ttl_minutes?: number
}

export type ApproveGrantResult = {
  granted: boolean
  grant_id?: string
  expires_at?: string
  [k: string]: unknown
}

/**
 * Approve a pending MCP access grant. Founder-only on the server side.
 * The tool itself enforces founder authorization via the bearer token.
 */
export async function approveGrant(
  args: ApproveGrantArgs
): Promise<McpCallResult<ApproveGrantResult>> {
  return callPranixTool<ApproveGrantResult>('mcp_access_approve_grant', args)
}

// ─── Internals ────────────────────────────────────────────────────

function cryptoRandomId(): string {
  // Node 19+ exposes globalThis.crypto with randomUUID; Edge runtime too.
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  // Fallback — collision odds are irrelevant for request IDs.
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
