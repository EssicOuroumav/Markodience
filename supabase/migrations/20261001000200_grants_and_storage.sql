-- Droits d'accès explicites (les projets Supabase récents n'accordent plus
-- de droits par défaut) + bucket logos. Script ré-exécutable sans risque.

-- Utilisateurs connectés : accès contrôlé par RLS. Aucun accès pour anon.
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  brand_profiles, brand_identity, content_pillars, tone_voice,
  editorial_lines, editorial_entries, audits, kpi_reports, operational_rules
to authenticated;

-- Abonnement : lecture seule côté utilisateur (écritures par le backend).
grant select on subscriptions to authenticated;

-- Backend (service role) : accès complet.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Fonction et trigger d'abonnement gratuit (ré-exécutable)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bucket logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists logos_insert_own on storage.objects;
drop policy if exists logos_update_own on storage.objects;
drop policy if exists logos_delete_own on storage.objects;

create policy logos_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logos_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
