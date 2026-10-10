-- Lot D : communauté & modération, indicateurs de performance personnalisables, actions correctives.
-- Toutes les tables suivent la même règle : propriétaire de la marque uniquement, plafond par marque, création réservée aux offres payantes.

-- ───────────────────────────── Communauté : réponses types, scripts, protocole de crise ─────────────────────────────
create table if not exists community_items (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  kind text not null check (kind in ('faq', 'script', 'crise')),
  title text not null check (char_length(title) between 1 and 160),
  situation text not null default '' check (char_length(situation) <= 600),
  body text not null default '' check (char_length(body) <= 3000),
  level text check (level in ('faible', 'moyen', 'grave')),
  owner text not null default '' check (char_length(owner) <= 120),
  source text not null default 'manuel' check (source in ('manuel', 'ia')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists community_items_brand_idx on community_items (brand_profile_id, kind, position);

-- ───────────────────────────── Suivi des interactions (chaudes / tièdes / froides) ─────────────────────────────
create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  person text not null check (char_length(person) between 1 and 120),
  network text not null default '' check (char_length(network) <= 40),
  temperature text not null default 'tiede' check (temperature in ('chaude', 'tiede', 'froide')),
  note text not null default '' check (char_length(note) <= 1000),
  next_step text not null default '' check (char_length(next_step) <= 400),
  due_date date,
  status text not null default 'a_suivre' check (status in ('a_suivre', 'en_cours', 'conclue', 'abandonnee')),
  created_at timestamptz not null default now()
);
create index if not exists interactions_brand_idx on interactions (brand_profile_id, status, created_at desc);

-- ───────────────────────────── Indicateurs personnalisables ─────────────────────────────
create table if not exists kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  unit text not null default '' check (char_length(unit) <= 20),
  direction text not null default 'hausse' check (direction in ('hausse', 'baisse')),
  baseline numeric check (baseline is null or abs(baseline) <= 1000000000),
  target numeric check (target is null or abs(target) <= 1000000000),
  period text not null default 'mensuel' check (period in ('hebdomadaire', 'mensuel', 'trimestriel', 'annuel')),
  source text not null default '' check (char_length(source) <= 160),
  frequency text not null default '' check (char_length(frequency) <= 80),
  alert_threshold numeric check (alert_threshold is null or abs(alert_threshold) <= 1000000000),
  owner text not null default '' check (char_length(owner) <= 120),
  corrective_action text not null default '' check (char_length(corrective_action) <= 600),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kpi_definitions_brand_idx on kpi_definitions (brand_profile_id, position);

create table if not exists kpi_values (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references kpi_definitions on delete cascade,
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  month date not null,
  value numeric not null check (abs(value) <= 1000000000),
  created_at timestamptz not null default now(),
  unique (definition_id, month)
);
create index if not exists kpi_values_brand_idx on kpi_values (brand_profile_id, month);

create table if not exists kpi_actions (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  definition_id uuid references kpi_definitions on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  owner text not null default '' check (char_length(owner) <= 120),
  due_date date,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait')),
  created_at timestamptz not null default now()
);
create index if not exists kpi_actions_brand_idx on kpi_actions (brand_profile_id, status, created_at desc);

-- ───────────────────────────── Sécurité : mêmes règles partout ─────────────────────────────
do $$
declare
  t record;
begin
  for t in select * from (values
    ('community_items', 80), ('interactions', 300), ('kpi_definitions', 40), ('kpi_values', 1500), ('kpi_actions', 150)
  ) as v(name, cap) loop
    execute format('alter table %I enable row level security', t.name);
    execute format('drop policy if exists %I on %I', t.name || '_own', t.name);
    execute format('create policy %I on %I for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id))', t.name || '_own', t.name);
    execute format('drop policy if exists %I on %I', t.name || '_cap', t.name);
    execute format('create policy %I on %I as restrictive for insert to authenticated with check ((select count(*) from %I x where x.brand_profile_id = %I.brand_profile_id) < %s)', t.name || '_cap', t.name, t.name, t.name, t.cap);
    execute format('drop policy if exists plan_gate_ins on %I', t.name);
    execute format('create policy plan_gate_ins on %I as restrictive for insert to authenticated with check (public.my_plan() <> ''gratuit'')', t.name);
    execute format('grant select, insert, update, delete on %I to authenticated', t.name);
    execute format('grant all on %I to service_role', t.name);
  end loop;
end $$;

-- Une valeur ne peut être rattachée qu'à un indicateur de la même marque.
create or replace function kpi_values_same_brand() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from kpi_definitions d where d.id = new.definition_id and d.brand_profile_id = new.brand_profile_id) then
    raise exception 'indicateur d''une autre marque';
  end if;
  return new;
end $$;
drop trigger if exists kpi_values_same_brand_t on kpi_values;
create trigger kpi_values_same_brand_t before insert or update on kpi_values for each row execute function kpi_values_same_brand();

create or replace function kpi_actions_same_brand() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.definition_id is not null and not exists (select 1 from kpi_definitions d where d.id = new.definition_id and d.brand_profile_id = new.brand_profile_id) then
    raise exception 'indicateur d''une autre marque';
  end if;
  return new;
end $$;
drop trigger if exists kpi_actions_same_brand_t on kpi_actions;
create trigger kpi_actions_same_brand_t before insert or update on kpi_actions for each row execute function kpi_actions_same_brand();
