# 07 — AI Orchestration Strategy

## 4-Tier Integration Honesty Matrix

Every AI integration is classified by its actual integration depth. No feature is claimed without evidence.

### Tier A — API (Direct)
Full API integration. Claude, OpenAI, Gemini, Groq called via server-side HTTP.

| Provider | Model | Status | Env var |
|---|---|---|---|
| Anthropic Claude | claude-sonnet-4 | Configured, not yet invoked | `PMCP_ANTHROPIC_API_KEY` |
| NVIDIA NIM | llama-3.1-70b | Configured, not yet invoked | `NVIDIA_API_KEY` |
| OpenAI | gpt-4o | Not configured | `OPENAI_API_KEY` |
| Google Gemini | gemini-2.5 | Not configured | `GOOGLE_AI_KEY` |
| Groq | mixtral-8x7b | Not configured | `GROQ_API_KEY` |

### Tier B — MCP (Tool-mediated)
Accessed through MCP gateway tools. The Pranix agent engine itself.

- `inference_route` — hybrid cascade through tiers
- `inference_health` — tier availability check
- `inference_cost_summary` — usage breakdown

### Tier C — Browser-bridged (Opt-in, experimental)
Would require the browser worker (Fly.io) to be live. Not yet deployed.

- Scraping, form-filling, visual verification
- Explicit founder opt-in per task

### Tier D — Manual / Experimental
Requires human-in-the-loop or manual setup.

- Custom model fine-tuning
- Local Ollama inference

---

## Provider-Agnostic Adapter Interface

```typescript
interface InferenceAdapter {
  route(prompt: string, taskType: string): Promise<InferenceResult>
  health(): Promise<TierHealth[]>
  costSummary(): Promise<CostBreakdown>
}
```

The UI never names a provider unless the founder explicitly selected one.

---

## Orchestration Surface Design

`/founder/orchestrate` (Phase 2):
- Chat-like input with provider picker
- Execution log showing routing decisions
- Cost estimate before execution
- Result display with source attribution

---

## Integration Honesty Rules

1. Never show a provider as "available" unless the env var is set AND a health check passes
2. Never default to a premium tier — always start at deterministic/local
3. Show cost before execution when possible
4. Log every inference call to `inference_log` for auditability
5. The cascade order is configurable but defaults to cheapest-first
