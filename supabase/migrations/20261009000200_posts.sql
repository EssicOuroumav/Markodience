-- Publications rédigées à partir de la ligne éditoriale (légende, idée de visuel, hashtags) et placées au calendrier.
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  editorial_entry_id uuid references editorial_entries on delete set null,
  channel text,
  scheduled_date date,
  caption text not null default '',
  visual_idea text not null default '',
  hashtags text not null default '',
  call_to_action text not null default '',
  status text not null default 'brouillon' check (status in ('brouillon', 'pret', 'publie')),
  created_at timestamptz not null default now()
);
create index if not exists posts_brand_date_idx on posts (brand_profile_id, scheduled_date);
create index if not exists posts_entry_idx on posts (editorial_entry_id);

alter table posts enable row level security;
drop policy if exists posts_own on posts;
create policy posts_own on posts
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));

-- Même verrouillage que la ligne éditoriale : écriture réservée aux paliers payants.
drop policy if exists plan_gate_ins on posts;
drop policy if exists plan_gate_upd on posts;
drop policy if exists plan_gate_del on posts;
create policy plan_gate_ins on posts as restrictive for insert to authenticated with check (public.my_plan() <> 'gratuit');
create policy plan_gate_upd on posts as restrictive for update to authenticated using (public.my_plan() <> 'gratuit') with check (public.my_plan() <> 'gratuit');
create policy plan_gate_del on posts as restrictive for delete to authenticated using (public.my_plan() <> 'gratuit');

grant select, insert, update, delete on posts to authenticated;
grant all on posts to service_role;
