-- Limites de profils de marque : Gratuit 1, Pro 3, Agence 10. Le propriétaire (rôle admin) n'a pas de limite.
-- Script ré-exécutable. Répète les valeurs de lib/plans.ts (vérifiées par plans.test.ts).

create or replace function public.plan_max_profiles(p text)
returns int
language sql
immutable
as $$
  select case p when 'gratuit' then 1 when 'pro' then 3 when 'agence' then 10 else 1 end;
$$;

drop policy if exists plan_profiles_limit on brand_profiles;
create policy plan_profiles_limit on brand_profiles
  as restrictive for insert to authenticated
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or public.my_profile_count() < public.plan_max_profiles(public.my_plan())
  );
