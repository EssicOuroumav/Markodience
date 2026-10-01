-- Étapes 4 à 9 : ligne éditoriale (validation, ordre), audits (storage), KPIs,
-- Guide Lives, abonnements. Script ré-exécutable sans risque.

-- ------------------------------------------------ ligne éditoriale (prompt 3)
alter table editorial_entries add column if not exists position int default 0;
alter table editorial_entries add column if not exists validation_requested_by text;
alter table editorial_entries add column if not exists validation_requested_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'editorial_lines_brand_channel_key') then
    alter table editorial_lines add constraint editorial_lines_brand_channel_key unique (brand_profile_id, channel);
  end if;
end $$;

-- ------------------------------------------------------- brand_profiles (5, 7)
alter table brand_profiles add column if not exists kpi_deadline_day int default 5
  check (kpi_deadline_day between 1 and 28);
alter table brand_profiles add column if not exists lives_enabled boolean default false;

-- ------------------------------------------------------------ Guide Lives (7)
create table if not exists live_guides (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  objective text not null check (objective in ('vente', 'formation', 'information', 'promotion', 'echange')),
  structure_data jsonb,
  created_at timestamptz default now(),
  unique (brand_profile_id, objective)
);
create index if not exists live_guides_brand_idx on live_guides (brand_profile_id);

create table if not exists live_team_members (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  name text not null,
  role text,
  channel text,
  rotation_week int
);
create index if not exists live_team_brand_idx on live_team_members (brand_profile_id);

create table if not exists live_scripts (
  id uuid primary key default gen_random_uuid(),
  live_guide_id uuid references live_guides on delete cascade not null,
  situation text,
  content text,
  is_quick_reply boolean default false
);
create index if not exists live_scripts_guide_idx on live_scripts (live_guide_id);

create or replace function public.owns_live_guide(g_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from live_guides g
    join brand_profiles bp on bp.id = g.brand_profile_id
    where g.id = g_id and bp.user_id = auth.uid()
  );
$$;

alter table live_guides enable row level security;
alter table live_team_members enable row level security;
alter table live_scripts enable row level security;

drop policy if exists live_guides_own on live_guides;
drop policy if exists live_team_members_own on live_team_members;
drop policy if exists live_scripts_own on live_scripts;

create policy live_guides_own on live_guides
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy live_team_members_own on live_team_members
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy live_scripts_own on live_scripts
  for all using (owns_live_guide(live_guide_id)) with check (owns_live_guide(live_guide_id));

grant select, insert, update, delete on live_guides, live_team_members, live_scripts to authenticated;
grant all on live_guides, live_team_members, live_scripts to service_role;

-- --------------------------------------------------------- abonnements (8)
alter table subscriptions add column if not exists seats int default 1;
alter table subscriptions add column if not exists current_period_start date;
alter table subscriptions add column if not exists current_period_end date;
alter table subscriptions add column if not exists cinetpay_transaction_id text;

-- Plan actif : un plan payant expiré retombe sur « gratuit ».
create or replace function public.active_plan(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
              when s.plan = 'gratuit' then 'gratuit'
              when s.status = 'active' and (s.current_period_end is null or s.current_period_end >= current_date) then s.plan
              else 'gratuit'
            end
     from subscriptions s where s.user_id = uid),
    'gratuit');
$$;

create or replace function public.active_subscription(uid uuid)
returns table (plan text, seats int, current_period_end date)
language sql
stable
security definer
set search_path = public
as $$
  select active_plan(uid), coalesce(s.seats, 1), s.current_period_end
  from subscriptions s where s.user_id = uid;
$$;

-- Un utilisateur ne peut interroger que son propre plan.
revoke all on function public.active_plan(uuid) from public, anon, authenticated;
revoke all on function public.active_subscription(uuid) from public, anon, authenticated;
grant execute on function public.active_plan(uuid) to service_role;
grant execute on function public.active_subscription(uuid) to service_role;

create or replace function public.my_plan()
returns text
language sql
stable
security definer
set search_path = public
as $$ select active_plan(auth.uid()); $$;

create or replace function public.my_subscription()
returns table (plan text, seats int, current_period_end date)
language sql
stable
security definer
set search_path = public
as $$ select * from active_subscription(auth.uid()); $$;

revoke all on function public.my_plan() from public, anon;
revoke all on function public.my_subscription() from public, anon;
grant execute on function public.my_plan() to authenticated;
grant execute on function public.my_subscription() to authenticated;

-- ------------------------------------------------------------ Storage audits (4)
-- Chemin : {brand_profile_id}/{audit_id}/{fichier}. Bucket privé, 10 Mo, images + PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audits', 'audits', false, 10485760, array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists audits_select_own on storage.objects;
drop policy if exists audits_insert_own on storage.objects;
drop policy if exists audits_delete_own on storage.objects;

create policy audits_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'audits' and public.owns_brand(((storage.foldername(name))[1])::uuid));
create policy audits_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audits' and public.owns_brand(((storage.foldername(name))[1])::uuid));
create policy audits_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'audits' and public.owns_brand(((storage.foldername(name))[1])::uuid));
