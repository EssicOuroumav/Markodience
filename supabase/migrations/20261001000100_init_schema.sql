-- Markodience : schéma initial + RLS
-- Principe : chaque ligne appartient à un utilisateur, directement (user_id)
-- ou via brand_profiles. Aucune table n'est accessible sans policy.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tables

create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) between 1 and 120),
  sector text,
  logo_url text,
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  status text check (status in ('freelance', 'organisation')),
  created_at timestamptz default now()
);
create index on brand_profiles (user_id);

create table brand_identity (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null unique,
  positioning text,
  target_segments jsonb,
  visual_palette jsonb,
  marketing_objectives jsonb,
  questionnaire jsonb
);

create table content_pillars (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  name text,
  description text,
  examples jsonb
);
create index on content_pillars (brand_profile_id);

create table tone_voice (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null unique,
  do_list jsonb,
  dont_list jsonb
);

create table editorial_lines (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  channel text,
  period_start date,
  period_end date
);
create index on editorial_lines (brand_profile_id);

create table editorial_entries (
  id uuid primary key default gen_random_uuid(),
  editorial_line_id uuid references editorial_lines on delete cascade not null,
  week_number int,
  theme text,
  content_type text,
  format text,
  frequency text,
  suggested_time text,
  status text check (status in ('a_venir', 'en_cours', 'termine')) default 'a_venir',
  validation_status text check (validation_status in ('non_requis', 'en_attente', 'valide')) default 'non_requis',
  validated_by text,
  validated_at timestamptz
);
create index on editorial_entries (editorial_line_id);

create table audits (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  source_files jsonb,
  report_data jsonb,
  created_at timestamptz default now()
);
create index on audits (brand_profile_id);

create table kpi_reports (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  month date,
  data jsonb,
  submitted_at timestamptz,
  deadline date,
  unique (brand_profile_id, month)
);

create table operational_rules (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles on delete cascade not null,
  section text,
  content text,
  unique (brand_profile_id, section)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  plan text check (plan in ('gratuit', 'pro', 'agence')) default 'gratuit',
  payment_provider text,
  status text,
  renewal_date date
);

-- ------------------------------------------------------------ helpers RLS

-- security definer : évite la récursion de policies et un aller-retour par ligne.
create or replace function public.owns_brand(bp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from brand_profiles
    where id = bp_id and user_id = auth.uid()
  );
$$;

create or replace function public.owns_editorial_line(el_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from editorial_lines el
    join brand_profiles bp on bp.id = el.brand_profile_id
    where el.id = el_id and bp.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------- RLS

alter table brand_profiles enable row level security;
alter table brand_identity enable row level security;
alter table content_pillars enable row level security;
alter table tone_voice enable row level security;
alter table editorial_lines enable row level security;
alter table editorial_entries enable row level security;
alter table audits enable row level security;
alter table kpi_reports enable row level security;
alter table operational_rules enable row level security;
alter table subscriptions enable row level security;

create policy brand_profiles_own on brand_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tables rattachées à un profil de marque
create policy brand_identity_own on brand_identity
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy content_pillars_own on content_pillars
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy tone_voice_own on tone_voice
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy editorial_lines_own on editorial_lines
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy audits_own on audits
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy kpi_reports_own on kpi_reports
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
create policy operational_rules_own on operational_rules
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));

create policy editorial_entries_own on editorial_entries
  for all using (owns_editorial_line(editorial_line_id))
  with check (owns_editorial_line(editorial_line_id));

-- Abonnement : lecture seule pour l'utilisateur. Les écritures passent par le
-- backend (service role : webhook de paiement, trigger d'inscription).
create policy subscriptions_read_own on subscriptions
  for select using (user_id = auth.uid());

-- ------------------------------------------- abonnement gratuit à l'inscription

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into subscriptions (user_id, plan, status)
  values (new.id, 'gratuit', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- Storage

-- Logos : lecture publique (affichés dans l'en-tête), écriture limitée au
-- dossier de l'utilisateur ({user_id}/...), images uniquement, 2 Mo max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy logos_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
