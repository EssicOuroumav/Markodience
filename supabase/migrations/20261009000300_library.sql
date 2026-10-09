-- Bibliothèque de contenus : logos, photos, visuels et documents d'une marque (paliers payants).
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  name text not null,
  category text not null default 'autre' check (category in ('logo', 'photo', 'visuel', 'document', 'autre')),
  path text not null unique,
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);
create index if not exists assets_brand_idx on assets (brand_profile_id, created_at desc);

alter table assets enable row level security;
drop policy if exists assets_own on assets;
create policy assets_own on assets
  for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));

-- Écriture réservée aux paliers payants, et au plus 200 fichiers par marque.
drop policy if exists plan_gate_ins on assets;
drop policy if exists plan_gate_upd on assets;
drop policy if exists plan_gate_del on assets;
create policy plan_gate_ins on assets as restrictive for insert to authenticated with check (public.my_plan() <> 'gratuit');
create policy plan_gate_upd on assets as restrictive for update to authenticated using (public.my_plan() <> 'gratuit') with check (public.my_plan() <> 'gratuit');
create policy plan_gate_del on assets as restrictive for delete to authenticated using (public.my_plan() <> 'gratuit');

grant select, insert, update, delete on assets to authenticated;
grant all on assets to service_role;

-- Dossier privé : un sous-dossier par marque ; seul le propriétaire de la marque lit, dépose et supprime.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists library_select_own on storage.objects;
drop policy if exists library_insert_own on storage.objects;
drop policy if exists library_delete_own on storage.objects;
create policy library_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'library' and public.owns_brand(((storage.foldername(name))[1])::uuid));
create policy library_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library' and public.owns_brand(((storage.foldername(name))[1])::uuid));
create policy library_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'library' and public.owns_brand(((storage.foldername(name))[1])::uuid));

-- Verrous du dépôt : palier payant et 200 fichiers au plus par marque (appliqués même si l'on contourne l'application).
drop policy if exists plan_gate_library_upload on storage.objects;
create policy plan_gate_library_upload on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'library'
    or (
      public.my_plan() <> 'gratuit'
      and (select count(*) from storage.objects o where o.bucket_id = 'library' and (storage.foldername(o.name))[1] = (storage.foldername(name))[1]) < 200
    )
  );
