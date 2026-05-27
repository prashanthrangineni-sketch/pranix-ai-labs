# Pranix AI Labs

Founder operating system for Pranix AI Labs Pvt Ltd.

**Live:** https://pranixailabs.com  
**Founder OS:** https://pranixailabs.com/founder

## Public pages
- `/` — Home
- `/(public)/products` — Products
- `/(public)/infrastructure` — Infrastructure
- `/(public)/status` — System status

## Founder Console
Auth-gated via Supabase magic link. Access restricted to `dashboard_founders` allowlist.

Routes: `/founder` · `/founder/tasks` · `/founder/alerts` · `/founder/approvals` · `/founder/workers` · `/founder/memory` · `/founder/orchestrate` · `/founder/baselines` · `/founder/actions` · `/founder/vault`

## Stack
Next.js 14 · Supabase (`mvdjyjccvioxircxuzgz`) · Tailwind CSS · Vercel

## Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
CONTROL_PLANE_SUPABASE_URL
CONTROL_PLANE_SERVICE_ROLE_KEY
```
