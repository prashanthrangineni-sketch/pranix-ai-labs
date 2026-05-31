-- migrations/20260531_dashboard_founders_role.sql
--
-- Adds least-privilege role support to dashboard_founders (control plane:
-- mvdjyjccvioxircxuzgz). Apply on the control-plane database.
--
-- SEQUENCING (important): apply this migration AND deploy the route guards
-- (lib/auth.ts requireWritableFounder + per-route checks) BEFORE inserting the
-- QA readonly row, otherwise the QA account would have full founder access in
-- the gap.

alter table public.dashboard_founders
  add column if not exists role text not null default 'founder';

-- Constrain to known roles (existing rows already default to 'founder').
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dashboard_founders_role_check'
  ) then
    alter table public.dashboard_founders
      add constraint dashboard_founders_role_check check (role in ('founder','readonly'));
  end if;
end $$;

-- The QA readonly row is inserted ONLY AFTER the Supabase auth user exists
-- (created via auth.admin.createUser — not SQL) and AFTER the guards are deployed:
--
-- insert into public.dashboard_founders (email, role)
--   values ('qa-dashboard@pranixailabs.com', 'readonly')
--   on conflict (email) do update set role = excluded.role;

-- ROLLBACK:
--   delete from public.dashboard_founders where role = 'readonly';
--   alter table public.dashboard_founders drop constraint if exists dashboard_founders_role_check;
--   alter table public.dashboard_founders drop column if exists role;
