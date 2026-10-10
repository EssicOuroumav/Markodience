-- Lot B : cibles et personas, piliers enrichis (méthode en 6 étapes, test des 4 questions), banque d'idées, lien idée → publication.

-- ───────────────────────────── Correctif : plafond de la bibliothèque ─────────────────────────────
-- Le plafond de 200 fichiers par marque comptait, par erreur, les fichiers de tous les comptes (la colonne « name » du sous-select
-- désignait la ligne comptée, pas la ligne ajoutée). On qualifie la ligne ajoutée.
drop policy if exists plan_gate_library_upload on storage.objects;
create policy plan_gate_library_upload on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'library'
    or (
      public.my_plan() <> 'gratuit'
      and (
        select count(*) from storage.objects o
        where o.bucket_id = 'library' and (storage.foldername(o.name))[1] = (storage.foldername(objects.name))[1]
      ) < 200
    )
  );

-- ───────────────────────────── Personas ─────────────────────────────
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  profile text not null default '' check (char_length(profile) <= 1000),
  needs text not null default '' check (char_length(needs) <= 1000),
  frictions text not null default '' check (char_length(frictions) <= 1000),
  tone text not null default '' check (char_length(tone) <= 1000),
  levers text not null default '' check (char_length(levers) <= 1000),
  channels text[] not null default '{}',
  priority text not null default 'secondaire' check (priority in ('principal', 'secondaire')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists personas_brand_idx on personas (brand_profile_id, position);
alter table personas enable row level security;
drop policy if exists personas_own on personas;
create policy personas_own on personas for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
drop policy if exists personas_cap on personas;
create policy personas_cap on personas as restrictive for insert to authenticated
  with check ((select count(*) from personas x where x.brand_profile_id = personas.brand_profile_id) < 12);
grant select, insert, update, delete on personas to authenticated;
grant all on personas to service_role;

-- ───────────────────────────── Piliers enrichis ─────────────────────────────
alter table content_pillars add column if not exists objective text check (objective is null or char_length(objective) <= 400);
alter table content_pillars add column if not exists persona_ids uuid[] not null default '{}';
alter table content_pillars add column if not exists subthemes text[] not null default '{}';
alter table content_pillars add column if not exists cta text check (cta is null or char_length(cta) <= 300);
alter table content_pillars add column if not exists kpi text check (kpi is null or char_length(kpi) <= 300);
alter table content_pillars add column if not exists rationale text check (rationale is null or char_length(rationale) <= 1000);
alter table content_pillars add column if not exists status text not null default 'hypothese' check (status in ('hypothese', 'valide'));

-- Diagnostic et brief stratégique (problème, objectif prioritaire, hypothèses) : un par marque, accessible à tous les paliers.
alter table brand_identity add column if not exists diagnostic jsonb;

-- ───────────────────────────── Banque d'idées ─────────────────────────────
create table if not exists content_ideas (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  pillar_id uuid references content_pillars on delete set null,
  persona_id uuid references personas on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  notes text not null default '' check (char_length(notes) <= 2000),
  source text not null default 'idee' check (source in ('idee', 'veille', 'benchmark', 'terrain', 'ia')),
  url text check (url is null or url ~* '^https?://'),
  competitor text check (competitor is null or char_length(competitor) <= 120),
  subtheme text check (subtheme is null or char_length(subtheme) <= 200),
  format text check (format is null or char_length(format) <= 80),
  networks text[] not null default '{}',
  status text not null default 'a_trier' check (status in ('a_trier', 'retenue', 'produite', 'ecartee')),
  created_at timestamptz not null default now()
);
create index if not exists ideas_brand_idx on content_ideas (brand_profile_id, status, created_at desc);
create index if not exists ideas_pillar_idx on content_ideas (pillar_id);
alter table content_ideas enable row level security;
drop policy if exists ideas_own on content_ideas;
create policy ideas_own on content_ideas for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
drop policy if exists ideas_cap on content_ideas;
create policy ideas_cap on content_ideas as restrictive for insert to authenticated
  with check ((select count(*) from content_ideas x where x.brand_profile_id = content_ideas.brand_profile_id) < 1000);
grant select, insert, update, delete on content_ideas to authenticated;
grant all on content_ideas to service_role;

-- Une publication peut venir d'une idée : la chaîne objectif → pilier → idée → publication reste traçable.
alter table posts add column if not exists idea_id uuid references content_ideas on delete set null;
