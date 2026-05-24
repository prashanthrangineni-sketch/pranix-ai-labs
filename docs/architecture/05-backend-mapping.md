# 05 — Backend Mapping

Every UI surface maps to a real table, view, or RPC in the `pranix_agents` Supabase project (`mvdjyjccvioxircxuzgz`), or is explicitly marked **deferred**. No fabricated data sources.

Data access pattern:
- **Public surfaces** read via RLS-protected anon-key reads of a narrow allow-list of fields
- **Founder surfaces** read via authenticated server components using the founder's session
- **Mutations** never touch the DB directly — every mutation goes through an MCP tool call

---

## 1. Public Surface Mappings

### `/` (Home)
| Block | Source |
|---|---|
| Hero statement | static |
| Product strip | `v_infra_topology` filtered by account_tier |
| Status pulse | `system_state` aggregated |

### `/products`
| Block | Source |
|---|---|
| Product cards | `v_infra_topology` |
| Placeholder cards | `project_registry` where account_tier='placeholder' |

### `/status`
| Block | Source |
|---|---|
| Overall status | `founder_alerts` critical count + worker heartbeat freshness |
| Worker health | `worker_runs` latest completed_at |
| Product status | `v_infra_topology` deployment_health per product |
| Infrastructure | MCP gateway + control plane status |

---

## 2. Founder Surface Mappings

### `/founder` (Overview)
| Block | Source |
|---|---|
| System pulse | `tasks` count by state + `founder_alerts` count by level |
| Critical alerts | `founder_alerts` WHERE level='critical' ORDER BY created_at DESC |
| Pending approvals | `mcp_access_grants` WHERE granted_at IS NULL |
| Failure patterns | `failure_patterns` WHERE status='open' ORDER BY occurrences DESC |
| Product health grid | `v_infra_topology` |
| Recent digest | `founder_digest_log` ORDER BY digest_date DESC LIMIT 1 |

### `/founder/products`
| Block | Source |
|---|---|
| Product cards | `v_infra_topology` all fields |
| Incubation section | `v_infra_topology` where account_tier in ('placeholder','incubation') |

### `/founder/workers`
| Block | Source |
|---|---|
| Total runs | `worker_runs` count |
| Last heartbeat | `worker_runs` latest completed_at |
| Recent run stats | `worker_runs` last 100 rows aggregated |
| Run list | `worker_runs` last 30 rows |

### `/founder/alerts`
| Block | Source |
|---|---|
| Severity summary | `founder_alerts` count by level |
| Failure patterns | `failure_patterns` WHERE status='open' |

### `/founder/memory`
| Block | Source |
|---|---|
| Entries grouped by project | `execution_memory` all rows, grouped client-side |

---

## 3. Proposed New Tables

| Table | Purpose |
|---|---|
| `founder_alert_suppressions` | Suppress noisy alert sources |
| `founder_devices` | Registered devices for push |
| `founder_push_subscriptions` | VAPID push endpoints |
| `founder_orchestration_sessions` | Saved orchestration prompts/results |

## 4. Recommended Indexes

- `idx_founder_alerts_level_created` on `founder_alerts(level, created_at DESC)`
- `idx_failure_patterns_status_occ` on `failure_patterns(status, occurrences DESC)`
- `idx_worker_runs_started` on `worker_runs(started_at DESC)`
- `idx_tasks_state` on `tasks(state)`
- `idx_exec_memory_project_key` on `execution_memory(project, key)`
- `idx_grants_pending` on `mcp_access_grants(granted_at) WHERE granted_at IS NULL`
- `idx_topology_tier` on `project_registry(account_tier)`
- `idx_digest_date` on `founder_digest_log(digest_date DESC)`
