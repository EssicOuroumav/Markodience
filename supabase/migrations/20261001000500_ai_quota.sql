-- Quota quotidien de générations IA (contrôle de coût). Script ré-exécutable.
-- Le compteur se remet à zéro chaque jour à 00:00 UTC. Écritures réservées au backend.

create table if not exists ai_usage (
  user_id uuid references auth.users on delete cascade not null,
  day date not null default current_date,
  count int not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table ai_usage enable row level security;
drop policy if exists ai_usage_read_own on ai_usage;
create policy ai_usage_read_own on ai_usage for select using (user_id = auth.uid());
grant select on ai_usage to authenticated;
grant all on ai_usage to service_role;

-- Consomme une génération de façon atomique. Renvoie le nouveau total, ou -1 si la limite est atteinte.
create or replace function public.consume_ai_quota(p_user uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  insert into ai_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
    where ai_usage.count < p_limit
  returning count into v;
  return coalesce(v, -1);
end;
$$;

-- Rend une génération (échec côté IA : l'utilisateur ne perd pas son quota).
create or replace function public.refund_ai_quota(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update ai_usage set count = greatest(count - 1, 0) where user_id = p_user and day = current_date;
$$;

revoke all on function public.consume_ai_quota(uuid, int) from public, anon, authenticated;
revoke all on function public.refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, int) to service_role;
grant execute on function public.refund_ai_quota(uuid) to service_role;
