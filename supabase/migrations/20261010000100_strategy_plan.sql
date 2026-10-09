-- Plan stratégique : un cahier des charges, des étapes de génération enregistrées une à une, puis appliquées aux onglets.

-- Une ligne par marque : cahier des charges, brouillon de construction, et le plan validé (réseaux, organique, indicateurs, règles).
create table if not exists brand_strategy (
  brand_profile_id uuid primary key references brand_profiles on delete cascade,
  brief jsonb,
  draft jsonb,
  networks jsonb,
  organic jsonb,
  organic_done jsonb not null default '[]'::jsonb,
  kpi_plan jsonb,
  rules jsonb,
  critique jsonb,
  checks jsonb,
  built_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table brand_strategy enable row level security;
drop policy if exists brand_strategy_own on brand_strategy;
create policy brand_strategy_own on brand_strategy
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
drop policy if exists plan_gate_ins on brand_strategy;
drop policy if exists plan_gate_upd on brand_strategy;
drop policy if exists plan_gate_del on brand_strategy;
create policy plan_gate_ins on brand_strategy as restrictive for insert to authenticated with check (public.my_plan() <> 'gratuit');
create policy plan_gate_upd on brand_strategy as restrictive for update to authenticated using (public.my_plan() <> 'gratuit') with check (public.my_plan() <> 'gratuit');
create policy plan_gate_del on brand_strategy as restrictive for delete to authenticated using (public.my_plan() <> 'gratuit');
grant select, insert, update, delete on brand_strategy to authenticated;
grant all on brand_strategy to service_role;

-- Identité : tonalité par registre, exemple à éviter / à suivre, règle d'usage du logo.
alter table brand_identity add column if not exists tone_table jsonb;
alter table brand_identity add column if not exists rewrite jsonb;
alter table brand_identity add column if not exists logo_note text;

-- Piliers pondérés.
alter table content_pillars add column if not exists pct int check (pct is null or (pct >= 0 and pct <= 100));
alter table content_pillars add column if not exists role text;

-- Semaines de la ligne éditoriale : phase (avant, pendant, après, permanent) et campagne.
alter table editorial_entries add column if not exists phase text;
alter table editorial_entries add column if not exists campaign text;

-- Publications du plan : une ligne par publication prévue (idée, accroche, pilier, format), la légende vient ensuite.
alter table posts add column if not exists idea text not null default '';
alter table posts add column if not exists hook text not null default '';
alter table posts add column if not exists pillar text;
alter table posts add column if not exists format text;
