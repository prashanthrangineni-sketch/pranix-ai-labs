-- migrations/20260717_founder_ideas.sql
--
-- CC-2: Founder Dashboard Idea Capture table.
--

create table if not exists public.founder_ideas (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.founder_ideas enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'founder_ideas' and policyname = 'founders_read_write_founder_ideas') then
    create policy founders_read_write_founder_ideas on public.founder_ideas for all
      using (exists (select 1 from public.dashboard_founders df where df.email = (auth.jwt()->>'email')));
  end if;
end $$;

-- ROLLBACK:
--   drop table if exists public.founder_ideas;
