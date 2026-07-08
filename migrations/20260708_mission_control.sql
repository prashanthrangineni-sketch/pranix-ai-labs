-- migrations/20260708_mission_control.sql
--
-- MISSION CONTROL PHASE 1 (Pranix Aaria Mission Control Architecture v1, Phase 1).
-- Apply on the control-plane database (mvdjyjccvioxircxuzgz).
--
-- Core design rule encoded here: VERIFIER INDEPENDENCE.
-- A step's worker can claim 'claimed_done', but only a verifications row from a
-- DIFFERENT identity (enforced by CHECK constraint) moves it to 'verified'.
-- This turns the 6-documented-self-report-mismatch lesson into schema.

-- ── missions ────────────────────────────────────────────────────────
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  intent text,                          -- founder's original ask, verbatim
  product text,                         -- project_registry.project_name or null
  status text not null default 'active'
    check (status in ('proposed','active','blocked','completed','cancelled')),
  needs_founder boolean not null default false,
  founder_action text,                  -- what exactly the founder must do, if needs_founder
  created_by text not null default 'claude',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── mission_steps ───────────────────────────────────────────────────
create table if not exists public.mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  seq int not null default 0,
  title text not null,
  worker text not null,                 -- claude | antigravity | perplexity | claude_code | founder
  state text not null default 'pending'
    check (state in ('pending','in_progress','claimed_done','verified','failed','cancelled')),
  claim_note text,                      -- worker's own report (NEVER trusted as final)
  artifact_url text,                    -- PR / run / deployment link
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mission_steps_mission_idx on public.mission_steps (mission_id, seq);

-- ── verifications ───────────────────────────────────────────────────
create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  mission_step_id uuid not null references public.mission_steps(id) on delete cascade,
  worker text not null,                 -- who did the work
  verifier text not null,               -- who checked the live source of truth
  verdict text not null check (verdict in ('pass','fail','mismatch')),
  evidence_url text,                    -- the live source checked (Actions run, Vercel deploy, page)
  evidence_note text,
  created_at timestamptz not null default now(),
  -- THE RULE: nobody verifies their own work. Ever.
  constraint verifier_independent check (verifier <> worker)
);
create index if not exists verifications_step_idx on public.verifications (mission_step_id, created_at desc);

-- ── worker_heartbeats ───────────────────────────────────────────────
create table if not exists public.worker_heartbeats (
  worker text primary key,
  status text not null default 'idle' check (status in ('idle','working','blocked','offline')),
  current_task text,
  last_seen_at timestamptz not null default now()
);

-- ── RLS: founders read via dashboard session; gateway writes via service role ──
alter table public.missions enable row level security;
alter table public.mission_steps enable row level security;
alter table public.verifications enable row level security;
alter table public.worker_heartbeats enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'missions' and policyname = 'founders_read_missions') then
    create policy founders_read_missions on public.missions for select
      using (exists (select 1 from public.dashboard_founders df where df.email = (auth.jwt()->>'email')));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'mission_steps' and policyname = 'founders_read_mission_steps') then
    create policy founders_read_mission_steps on public.mission_steps for select
      using (exists (select 1 from public.dashboard_founders df where df.email = (auth.jwt()->>'email')));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'verifications' and policyname = 'founders_read_verifications') then
    create policy founders_read_verifications on public.verifications for select
      using (exists (select 1 from public.dashboard_founders df where df.email = (auth.jwt()->>'email')));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'worker_heartbeats' and policyname = 'founders_read_worker_heartbeats') then
    create policy founders_read_worker_heartbeats on public.worker_heartbeats for select
      using (exists (select 1 from public.dashboard_founders df where df.email = (auth.jwt()->>'email')));
  end if;
end $$;

-- ── updated_at triggers ─────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists missions_touch on public.missions;
create trigger missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();
drop trigger if exists mission_steps_touch on public.mission_steps;
create trigger mission_steps_touch before update on public.mission_steps
  for each row execute function public.touch_updated_at();

-- ── Seed: this week's real missions (idempotent) ────────────────────
insert into public.missions (id, title, intent, product, status, needs_founder, founder_action, created_by) values
  ('a0000000-0000-4000-8000-000000000001', 'EdGridAI KG-PG full curriculum + test engine content', 'All boards, every subject KG-PG, all competitive exams, PYQ-derived blueprints', 'vidyagrid', 'active', false, null, 'claude'),
  ('a0000000-0000-4000-8000-000000000002', 'Hybrid voice routing: per-provider feature flags', 'Task #98 — SARVAM/BHASHINI/CHATTERBOX enable flags in ProviderManager', 'pranix_aaria', 'active', false, null, 'claude'),
  ('a0000000-0000-4000-8000-000000000003', 'Gateway router constitutional fix (free inference only)', 'Re-point mcp_route_task classifier off paid Anthropic to Groq free', 'pranix_agents', 'active', true, 'Review and merge PR #63 on pranix-agent-engine', 'claude'),
  ('a0000000-0000-4000-8000-000000000004', 'Mission Control Phase 1 (this dashboard section)', 'Missions/steps/verifications schema + founder Mission Inbox', 'pranix_site', 'active', true, 'Run this migration on the control plane, then merge the dashboard PR', 'claude')
on conflict (id) do nothing;

-- ROLLBACK:
--   drop table if exists public.verifications;
--   drop table if exists public.mission_steps;
--   drop table if exists public.worker_heartbeats;
--   drop table if exists public.missions;
