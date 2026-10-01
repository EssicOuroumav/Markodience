-- Étape 9 : paiements + verrouillage des paliers au niveau de la base.
-- Le gating côté interface n'est qu'un confort : ce sont ces politiques RESTRICTIVES
-- qui empêchent un utilisateur du palier gratuit d'écrire dans les onglets payants,
-- même en appelant Supabase directement. Lecture conservée (un abonnement expiré ne
-- fait pas perdre l'accès à ses données). Script ré-exécutable.

-- ------------------------------------------------------------------ paiements
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  plan text not null check (plan in ('pro', 'agence')),
  seats int not null default 1,
  amount int not null check (amount > 0),
  provider text not null,
  provider_token text unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamptz default now(),
  confirmed_at timestamptz
);
create index if not exists payments_user_idx on payments (user_id);

alter table payments enable row level security;
drop policy if exists payments_read_own on payments;
create policy payments_read_own on payments for select using (user_id = auth.uid());
-- Aucune écriture côté utilisateur : uniquement le backend (service role).
grant select on payments to authenticated;
grant all on payments to service_role;

alter table subscriptions add column if not exists provider_transaction_id text;

-- ------------------------------------------------------ limite de profils (RLS)
create or replace function public.plan_max_profiles(p text)
returns int
language sql
immutable
as $$
  select case p when 'gratuit' then 1 when 'pro' then 3 else 2147483647 end;
$$;

create or replace function public.my_profile_count()
returns int
language sql
stable
security definer
set search_path = public
as $$ select count(*)::int from brand_profiles where user_id = auth.uid(); $$;
revoke all on function public.my_profile_count() from public, anon;
grant execute on function public.my_profile_count() to authenticated;

drop policy if exists plan_profiles_limit on brand_profiles;
create policy plan_profiles_limit on brand_profiles
  as restrictive for insert to authenticated
  with check (public.my_profile_count() < public.plan_max_profiles(public.my_plan()));

-- ------------------------------------------- onglets payants : écriture verrouillée
do $$
declare t text;
begin
  foreach t in array array[
    'audits', 'editorial_lines', 'editorial_entries', 'kpi_reports',
    'operational_rules', 'live_guides', 'live_team_members', 'live_scripts'
  ] loop
    execute format('drop policy if exists plan_gate_ins on %I', t);
    execute format('drop policy if exists plan_gate_upd on %I', t);
    execute format('drop policy if exists plan_gate_del on %I', t);
    execute format('create policy plan_gate_ins on %I as restrictive for insert to authenticated with check (public.my_plan() <> ''gratuit'')', t);
    execute format('create policy plan_gate_upd on %I as restrictive for update to authenticated using (public.my_plan() <> ''gratuit'') with check (public.my_plan() <> ''gratuit'')', t);
    execute format('create policy plan_gate_del on %I as restrictive for delete to authenticated using (public.my_plan() <> ''gratuit'')', t);
  end loop;
end $$;

-- Bucket des audits : dépôt réservé aux paliers payants
drop policy if exists plan_gate_audits_upload on storage.objects;
create policy plan_gate_audits_upload on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'audits' or public.my_plan() <> 'gratuit');
